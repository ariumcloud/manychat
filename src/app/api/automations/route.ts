import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import type { FlowEdge, FlowNode } from "@/lib/flow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  kind?: string;
  keywords?: string[];
  match_type?: string;
  media_id?: string | null;
  dm_text?: string;
  button_label?: string;
  button_url?: string;
  public_reply_enabled?: boolean;
  public_reply_texts?: string[];
  only_first_time?: boolean;
  follow_gate_enabled?: boolean;
  follow_gate_text?: string;
  follow_gate_button?: string;
};

/** Monta os blocos que entregam o conteúdo de verdade. */
function contentNodes(body: Body, x: number, y: number) {
  const nodes: FlowNode[] = [
    { id: "msg", type: "text", position: { x, y }, data: { text: body.dm_text!.trim() } },
  ];
  const edges: FlowEdge[] = [];

  if (body.button_label?.trim() && body.button_url?.trim()) {
    nodes.push({
      id: "btn",
      type: "buttons",
      position: { x: x + 320, y },
      data: {
        text: "Toque no botão abaixo 👇",
        buttons: [{ kind: "url", label: body.button_label.trim(), url: body.button_url.trim() }],
      },
    });
    edges.push({ id: "e-msg-btn", source: "msg", target: "btn" });
  }

  return { nodes, edges };
}

/**
 * Atalho do painel: cria o fluxo e o gatilho numa tacada só, já publicado.
 *
 * Com follow gate ligado, o fluxo vira uma bifurcação já na entrada:
 *
 *   gatilho → segue você?
 *               ├─ sim → conteúdo de verdade
 *               └─ não → pedido para seguir + botão "já te segui"
 *
 * O botão devolve o payload `flow:<id>@gate`, que retoma este mesmo fluxo no
 * portão — não do início, senão a mensagem-ponte sairia de novo a cada toque.
 * Como o motor rebusca o perfil ao avaliar a condição, a segunda passada já
 * enxerga quem acabou de seguir.
 */
async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Body;

  const keywords = (body.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  const dmText = body.dm_text?.trim();
  const gateOn = Boolean(body.follow_gate_enabled);
  const gateText = body.follow_gate_text?.trim();

  if (!dmText) {
    return NextResponse.json({ error: "Escreva a mensagem que será enviada na DM." }, { status: 400 });
  }
  if (!keywords.length && body.match_type !== "any") {
    return NextResponse.json({ error: "Informe pelo menos uma palavra-chave." }, { status: 400 });
  }
  if (gateOn && !gateText) {
    return NextResponse.json(
      { error: "Escreva a mensagem para quem ainda não te segue." },
      { status: 400 },
    );
  }

  const supabase = db();

  const nodes: FlowNode[] = [
    { id: "trigger", type: "trigger", position: { x: 60, y: 180 }, data: { label: "Gatilho" } },
  ];
  const edges: FlowEdge[] = [];

  if (gateOn) {
    // A condição é o primeiro passo: ninguém recebe nada antes de o portão
    // decidir. Quem já segue recebe o conteúdo de cara; quem não segue recebe o
    // pedido para seguir como PRIMEIRA mensagem.
    //
    // O Instagram não informa "essa pessoa te segue?" enquanto não existe uma
    // conversa, então num comentário o portão começa fechado. O motor refaz a
    // pergunta assim que a primeira mensagem abre a conversa e, se a pessoa já
    // seguia, emenda o conteúdo — ver `runFlow`.
    nodes.push({
      id: "gate",
      type: "condition",
      position: { x: 340, y: 180 },
      data: { field: "is_user_follow_business", op: "is_true" },
    });
    edges.push({ id: "e-trigger-gate", source: "trigger", target: "gate" });

    const content = contentNodes(body, 640, 60);
    nodes.push(...content.nodes);
    edges.push(...content.edges);
    edges.push({ id: "e-gate-yes", source: "gate", target: "msg", sourceHandle: "yes" });

    // O pedido vem em dois blocos de propósito. O botão é um template, que exige
    // uma conversa aberta — e num comentário ela só abre com a primeira
    // mensagem. Separados, o texto abre a conversa e o botão vem em seguida; e
    // é entre os dois que o motor reavalia quem segue.
    nodes.push({
      id: "ask-follow",
      type: "text",
      position: { x: 640, y: 340 },
      data: { text: gateText },
    });
    edges.push({ id: "e-gate-no", source: "gate", target: "ask-follow", sourceHandle: "no" });

    nodes.push({
      id: "follow-btn",
      type: "buttons",
      position: { x: 960, y: 340 },
      data: {
        text: "Toque no botão abaixo 👇",
        // payload preenchido depois do insert, quando o id do fluxo existe
        buttons: [
          {
            kind: "reply",
            label: (body.follow_gate_button || "JÁ TE SEGUI ✅").slice(0, 20),
            payload: "",
          },
        ],
      },
    });
    edges.push({ id: "e-ask-btn", source: "ask-follow", target: "follow-btn" });
  } else {
    const content = contentNodes(body, 360, 160);
    nodes.push(...content.nodes);
    edges.push(...content.edges);
    edges.push({ id: "e-trigger-msg", source: "trigger", target: "msg" });
  }

  const { data: flow, error: flowError } = await supabase
    .from("mc_flows")
    .insert({
      account_id: account.id,
      name: body.name?.trim() || keywords[0] || "Automação",
      status: "live",
      nodes,
      edges,
    })
    .select()
    .single();

  if (flowError) return NextResponse.json({ error: flowError.message }, { status: 500 });

  // Só agora existe um id para o botão "já te segui" apontar. O "@gate" faz a
  // execução voltar direto para o portão: reexecutar do gatilho reenviaria a
  // mensagem-ponte a cada toque no botão.
  if (gateOn) {
    const patched = nodes.map((n) =>
      n.id === "follow-btn"
        ? {
            ...n,
            data: {
              ...n.data,
              buttons: (n.data.buttons ?? []).map((b) =>
                b.kind === "reply" ? { ...b, payload: `flow:${flow.id}@gate` } : b,
              ),
            },
          }
        : n,
    );

    const { error: patchError } = await supabase
      .from("mc_flows")
      .update({ nodes: patched })
      .eq("id", flow.id);

    if (patchError) {
      await supabase.from("mc_flows").delete().eq("id", flow.id);
      return NextResponse.json({ error: patchError.message }, { status: 500 });
    }
    flow.nodes = patched;
  }

  const { data: trigger, error: triggerError } = await supabase
    .from("mc_triggers")
    .insert({
      account_id: account.id,
      flow_id: flow.id,
      kind: body.kind ?? "comment_keyword",
      keywords,
      match_type: body.match_type ?? "contains",
      media_id: body.media_id || null,
      public_reply_enabled: body.public_reply_enabled ?? false,
      public_reply_texts: (body.public_reply_texts ?? []).filter(Boolean),
      only_first_time: body.only_first_time ?? false,
    })
    .select("*, flows:mc_flows(id, name, status)")
    .single();

  if (triggerError) {
    // Sem gatilho o fluxo fica órfão e confunde a lista — desfaz.
    await supabase.from("mc_flows").delete().eq("id", flow.id);
    return NextResponse.json({ error: triggerError.message }, { status: 500 });
  }

  return NextResponse.json({ trigger, flow });
}

export const POST = withApi(postHandler);
