import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

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
};

/**
 * Atalho do painel: cria o fluxo (mensagem + botão opcional) e o gatilho
 * numa tacada só, já publicado. É o caminho de 90% dos casos —
 * quem quiser ramificações abre o construtor visual depois.
 */
async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Body;

  const keywords = (body.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  const dmText = body.dm_text?.trim();

  if (!dmText) {
    return NextResponse.json({ error: "Escreva a mensagem que será enviada na DM." }, { status: 400 });
  }
  if (!keywords.length && body.match_type !== "any") {
    return NextResponse.json({ error: "Informe pelo menos uma palavra-chave." }, { status: 400 });
  }

  const supabase = db();

  const nodes: unknown[] = [
    { id: "trigger", type: "trigger", position: { x: 60, y: 170 }, data: { label: "Gatilho" } },
    { id: "msg", type: "text", position: { x: 360, y: 150 }, data: { text: dmText } },
  ];
  const edges: unknown[] = [{ id: "e1", source: "trigger", target: "msg" }];

  if (body.button_label?.trim() && body.button_url?.trim()) {
    nodes.push({
      id: "btn",
      type: "buttons",
      position: { x: 680, y: 150 },
      data: {
        text: "Toque no botão abaixo 👇",
        buttons: [{ kind: "url", label: body.button_label.trim(), url: body.button_url.trim() }],
      },
    });
    edges.push({ id: "e2", source: "msg", target: "btn" });
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
