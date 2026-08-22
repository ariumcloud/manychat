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
  follow_gate_opener?: string;
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
 * Com follow gate ligado, o fluxo vira uma bifurcação:
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
    // Comentário → DM: a API só sabe se a pessoa te segue DEPOIS que existe uma
    // conversa. Então mandamos uma ponte primeiro (que abre a conversa via
    // private reply e resolve o IGSID real), e só aí o portão decide. Sem isso,
    // o seguidor que comenta é sempre tratado como "não segue".
    const isComment = (body.kind ?? "comment_keyword") === "comment_keyword";
    const gateEntry = isComment ? "opener" : "trigger";

    if (isComment) {
      nodes.push({
        id: "opener",
        type: "text",
        position: { x: 340, y: 180 },
        data: {
          // Esta mensagem sai antes de o portão saber se a pessoa te segue, então
          // ela não pode prometer a entrega: quem não segue receberia o "já tô te
          // mandando" e, logo depois, um pedido para seguir — parece bug.
          text: body.follow_gate_opener?.trim() || "Opa! Vi seu comentário 👀 Só um segundo…",
        },
      });
      edges.push({ id: "e-trigger-opener", source: "trigger", target: "opener" });
    }

    nodes.push({
      id: "gate",
      type: "condition",
      position: { x: isComment ? 620 : 340, y: 180 },
      data: { field: "is_user_follow_business", op: "is_true" },
    });
    edges.push({ id: "e-entry-gate", source: gateEntry, target: "gate" });

    const content = contentNodes(body, isComment ? 900 : 640, 60);
    nodes.push(...content.nodes);
    edges.push(...content.edges);
    edges.push({ id: "e-gate-yes", source: "gate", target: "msg", sourceHandle: "yes" });

    nodes.push({
      id: "ask-follow",
      type: "buttons",
      position: { x: isComment ? 900 : 640, y: 340 },
      data: {
        text: gateText,
        // Botão de verdade (template), não quick reply: a mensagem diz "toque no
        // botão abaixo" e o chip de resposta rápida some da conversa. Se o
        // Instagram recusar o template, o motor cai para quick reply sozinho.
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
    edges.push({ id: "e-gate-no", source: "gate", target: "ask-follow", sourceHandle: "no" });
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
      n.id === "ask-follow"
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
