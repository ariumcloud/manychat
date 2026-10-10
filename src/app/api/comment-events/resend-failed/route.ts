import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount, upsertContact } from "@/lib/repo";
import { runFlow } from "@/lib/flow/engine";
import type { Flow } from "@/lib/flow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TIME_BUDGET_MS = 240_000;

/**
 * Reenvia a DM (private reply) dos comentarios que a Meta recusou com
 * "Service temporarily unavailable". Fica atras do login do painel.
 *
 * Por padrao e um ensaio (dryRun): so lista quem receberia. Para enviar de
 * verdade passe `send: true`. Corpo (tudo opcional):
 *   hours  janela de comentarios recentes (padrao 12, max 168 = 7 dias da Meta)
 *   limit  quantos enviar por chamada (padrao 5)
 *   commentIds  so estes comentarios (ignora o filtro de erro; o evento precisa ter
 *     gatilho e DM nao enviada). Serve para quem comentou antes da automacao existir.
 *   gapMinSeconds / gapMaxSeconds  intervalo ALEATORIO entre envios (padrao 15-45),
 *     pra nao parecer disparo em massa nem tomar bloqueio por spam
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    hours?: number;
    limit?: number;
    gapMinSeconds?: number;
    gapMaxSeconds?: number;
    send?: boolean;
    commentIds?: string[];
  };
  const hours = Math.min(Math.max(body.hours ?? 12, 1), 168);
  const limit = Math.min(Math.max(body.limit ?? 5, 1), 30);
  const gapMin = Math.min(Math.max(body.gapMinSeconds ?? 15, 0), 120);
  const gapMax = Math.min(Math.max(body.gapMaxSeconds ?? 45, gapMin), 120);
  const nextGapMs = () => (gapMin + Math.random() * (gapMax - gapMin)) * 1000;
  const send = body.send === true;

  const supabase = db();
  const account = await getAccount();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const onlyIds = (body.commentIds ?? []).filter((id) => typeof id === "string" && id).slice(0, 20);
  let eventsQuery = supabase
    .from("mc_comment_events")
    .select("id, comment_id, from_igsid, from_username, text, matched_trigger_id, created_at")
    .eq("account_id", account.id)
    .eq("dm_sent", false)
    .not("matched_trigger_id", "is", null)
    .gte("created_at", since);
  eventsQuery = onlyIds.length
    ? eventsQuery.in("comment_id", onlyIds)
    : eventsQuery.ilike("error", "%temporarily unavailable%");
  const { data: events, error } = await eventsQuery.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Quem ja recebeu esse fluxo depois (outro comentario que funcionou) fica de fora.
  const { data: delivered } = await supabase
    .from("mc_comment_events")
    .select("from_username, matched_trigger_id")
    .eq("account_id", account.id)
    .eq("dm_sent", true)
    .gte("created_at", since);
  const done = new Set((delivered ?? []).map((d) => `${d.from_username}|${d.matched_trigger_id}`));

  // Um por pessoa e gatilho, o comentario mais recente (a lista ja vem do mais novo).
  const seen = new Set<string>();
  const queue = (events ?? []).filter((e) => {
    const key = `${e.from_username}|${e.matched_trigger_id}`;
    if (done.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const batch = queue.slice(0, limit);
  if (!send) {
    return NextResponse.json({
      dryRun: true,
      pending: queue.length,
      wouldSend: batch.map((e) => ({ user: e.from_username, at: e.created_at })),
    });
  }

  const started = Date.now();
  const results: Array<{ user: string | null; ok: boolean; error?: string }> = [];

  for (const e of batch) {
    if (Date.now() - started > TIME_BUDGET_MS) break;

    const { data: trigger } = await supabase
      .from("mc_triggers")
      .select("flow_id")
      .eq("id", e.matched_trigger_id)
      .maybeSingle();
    const { data: flowRow } = trigger
      ? await supabase.from("mc_flows").select("*").eq("id", trigger.flow_id).maybeSingle()
      : { data: null };
    if (!flowRow || flowRow.status !== "live") {
      results.push({ user: e.from_username, ok: false, error: "fluxo inativo ou removido" });
      continue;
    }

    const contact = await upsertContact(account.id, e.from_igsid ?? `pending:${e.comment_id}`, {
      username: e.from_username ?? null,
    });

    const result = await runFlow(flowRow as Flow, {
      accountId: account.id,
      contactId: contact.id,
      igsid: e.from_igsid,
      commentId: e.comment_id,
      lastText: e.text ?? "",
      source: "comment",
      sourceRef: e.comment_id,
      triggerId: e.matched_trigger_id,
    });

    await supabase
      .from("mc_comment_events")
      .update({ dm_sent: result.ok, error: result.error ?? null })
      .eq("id", e.id);

    results.push({ user: e.from_username, ok: result.ok, error: result.error });
    // Espera aleatoria antes do proximo; nao espera depois do ultimo nem se o tempo acabou.
    const last = e === batch[batch.length - 1];
    const wait = nextGapMs();
    if (!last && Date.now() - started + wait < TIME_BUDGET_MS) {
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return NextResponse.json({
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remaining: queue.length - results.length,
    results,
  });
}
