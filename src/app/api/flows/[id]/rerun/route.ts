import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import { getAccount, getOrCreateConversation } from "@/lib/repo";
import { runFlow } from "@/lib/flow/engine";
import type { Flow } from "@/lib/flow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * Roda o fluxo de novo para um contato, a partir de um nó. Serve para
 * recuperar quem ficou sem a mensagem por um erro que já passou (ex.: o
 * Instagram recusando o link rastreado). Protegida pelo login do painel.
 *
 * Com `commentId`, a primeira mensagem sai como resposta àquele comentário —
 * é o único jeito de alcançar quem ainda não te mandou DM (vale por 7 dias,
 * uma vez por comentário).
 */
async function postHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    contactId?: string;
    startNodeId?: string;
    commentId?: string;
  };
  if (!body.contactId || !body.startNodeId) {
    return NextResponse.json({ error: "Informe contactId e startNodeId." }, { status: 400 });
  }

  const account = await getAccount();
  const supabase = db();

  const { data: flow } = await supabase
    .from("mc_flows")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!flow) return NextResponse.json({ error: "Fluxo não encontrado." }, { status: 404 });
  if (!(flow as Flow).nodes?.some((n) => n.id === body.startNodeId)) {
    return NextResponse.json({ error: "Esse nó não existe no fluxo." }, { status: 400 });
  }

  const { data: contact } = await supabase
    .from("mc_contacts")
    .select("id, igsid")
    .eq("id", body.contactId)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });

  const conversation = body.commentId
    ? null
    : await getOrCreateConversation(account.id, contact.id);

  const result = await runFlow(flow as Flow, {
    accountId: account.id,
    contactId: contact.id,
    igsid: contact.igsid,
    conversationId: (conversation?.id as string | undefined) ?? null,
    commentId: body.commentId ?? null,
    source: "manual",
    sourceRef: body.commentId ?? null,
    startNodeId: body.startNodeId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export const POST = withApi(postHandler);
