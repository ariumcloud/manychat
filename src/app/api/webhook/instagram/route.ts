import { NextResponse, after } from "next/server";
import { env } from "@/lib/env";
import { verifySignature } from "@/lib/meta/verify";
import type { ChangeEvent, MessagingEvent, WebhookBody } from "@/lib/meta/types";
import { db } from "@/lib/supabase";
import { getAccount, getOrCreateConversation, recordMessage, upsertContact } from "@/lib/repo";
import { pickTrigger } from "@/lib/flow/matcher";
import { runFlow } from "@/lib/flow/engine";
import type { Flow, Trigger, TriggerKind } from "@/lib/flow/types";
import { replyToComment } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// O processamento roda depois da resposta (after()), mas o Meta manda
// varios eventos por chamada e o fluxo pode ter multiplos passos de "esperar"
// (ate 8s cada, ver MAX_DELAY_SECONDS) em sequencia. 15s estava insuficiente
// e a funcao estava sendo morta no meio de fluxos reais (ver logs de
// "Task timed out after 15 seconds"), cortando mensagens da automacao.
export const maxDuration = 60;

// Cache em memória para deduplicação rápida de webhooks sem bater no banco (10 min TTL)
const seenDedupeKeys = new Map<string, number>();

// Cache em memória para gatilhos e fluxos durante rajadas de comentários (30 seg TTL)
const triggersCache = new Map<string, { triggers: Trigger[]; at: number }>();
const flowCache = new Map<string, { flow: Flow | null; at: number }>();

/**
 * Botao fixo nao some depois do toque (o quick reply sumia), entao a pessoa
 * consegue tocar duas vezes seguidas — e cada toque e um postback legitimo,
 * com mid proprio. Sem trava, o conteudo sai duplicado.
 *
 * Mas "tocou de novo" tambem e o caminho normal de quem foi reprovado no
 * portao: recebe o pedido de seguir outra vez, vai seguir e toca de novo. Esse
 * toque NAO pode ser engolido — foi assim que um lead travou. Entao o toque so
 * e ignorado quando o run anterior do mesmo botao ainda esta rodando, ou
 * terminou entregando o conteudo (e nao o pedido/lembrete, nem nada).
 */
const TAP_WINDOW_MS = 15_000;
/** Rajada de toques na mesma instancia, antes de o run do primeiro existir no banco. */
const TAP_BURST_MS = 2_000;
const recentTaps = new Map<string, number>();

async function isRepeatedTap(
  contactId: string,
  conversationId: string,
  flow: Flow,
  payload: string,
) {
  const now = Date.now();
  const key = `${contactId}|${payload}`;
  const last = recentTaps.get(key);
  recentTaps.set(key, now);
  if (recentTaps.size > 1000) {
    for (const [k, at] of recentTaps) if (now - at > TAP_WINDOW_MS) recentTaps.delete(k);
  }
  if (last && now - last < TAP_BURST_MS) return true;

  const supabase = db();
  const { data: prev } = await supabase
    .from("mc_flow_runs")
    .select("started_at, finished_at, status")
    .eq("contact_id", contactId)
    .eq("flow_id", flow.id)
    .eq("source", "dm")
    .gte("started_at", new Date(now - TAP_WINDOW_MS).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prev) return false;
  // Toque duplo de verdade: o primeiro ainda esta sendo atendido.
  if (!prev.finished_at) return true;
  // Falhou: deixa tentar de novo.
  if (prev.status !== "done") return false;

  // O no que tem este botao e o "pedido" (ex.: "me segue aqui"). So ignora
  // se o run anterior entregou conteudo: se mandou o pedido/lembrete de novo,
  // ou nao mandou nada (lembrete silenciado), este toque vale.
  const askNodeIds = new Set(
    (flow.nodes ?? [])
      .filter((n) => n.data.buttons?.some((b) => b.kind === "reply" && b.payload === payload))
      .map((n) => n.id),
  );
  if (!askNodeIds.size) return true;

  const { data: sent } = await supabase
    .from("mc_messages")
    .select("payload")
    .eq("conversation_id", conversationId)
    .eq("direction", "out")
    .gte("created_at", prev.started_at)
    .limit(20);
  const nodes = (sent ?? []).map((m) => (m.payload as { nodeId?: string } | null)?.nodeId);
  return nodes.some((id) => id && !askNodeIds.has(id));
}

/**
 * Sem estas variaveis o webhook nao tem como funcionar. Melhor responder um erro
 * legivel do que um 500 mudo quando o Meta bater aqui.
 */
function missingConfig(): string[] {
  const needed = [
    "META_APP_SECRET",
    "META_VERIFY_TOKEN",
    "IG_ACCESS_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  return needed.filter((name) => !process.env[name]);
}

/**
 * GET = handshake. O Meta chama isto uma vez quando voce salva a URL do webhook
 * no painel e espera receber o hub.challenge de volta em texto puro.
 */
export async function GET(req: Request) {
  const missing = missingConfig();
  if (missing.length) {
    return new Response(`Faltam variaveis de ambiente: ${missing.join(", ")}`, { status: 503 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.metaVerifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST = eventos. Responde 200 na hora e processa depois (after), porque o Meta
 * reentrega o evento se demorarmos e isso viraria mensagem duplicada.
 */
export async function POST(req: Request) {
  const missing = missingConfig();
  if (missing.length) {
    console.error("[webhook] configuracao incompleta:", missing.join(", "));
    return new Response(`Faltam variaveis de ambiente: ${missing.join(", ")}`, { status: 503 });
  }

  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Assinatura invalida", { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return new Response("JSON invalido", { status: 400 });
  }

  after(async () => {
    try {
      await processWebhook(body);
    } catch (err) {
      console.error("[webhook] falha ao processar:", err);
    }
  });

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

/**
 * Quantas pessoas sao atendidas ao mesmo tempo dentro de um POST. O Meta junta
 * varios eventos num POST so quando o volume sobe; um por vez, a ~7s cada, a
 * funcao morria aos 60s com os ultimos na fila — ja marcados como vistos, entao
 * nunca mais tentados. Nao vai mais alto porque o Supabase e compartilhado.
 */
const WEBHOOK_CONCURRENCY = 4;

async function processWebhook(body: WebhookBody) {
  const supabase = db();

  // Uma fila por pessoa: os eventos dela seguem em ordem (mensagem e depois o
  // clique, por exemplo); pessoas diferentes andam em paralelo.
  const lanes = new Map<string, Array<() => Promise<void>>>();
  const enqueue = (lane: string, task: () => Promise<void>) => {
    const list = lanes.get(lane) ?? [];
    list.push(task);
    lanes.set(lane, list);
  };

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const key = event.message?.mid ?? event.postback?.mid ?? `${entry.id}:${event.timestamp}:msg`;
      enqueue(event.sender?.id ?? key, async () => {
        if (await alreadySeen(key, body.object, event)) return;
        await handleMessaging(event).catch((err) => logFailure(key, err));
      });
    }

    for (const change of entry.changes ?? []) {
      const key = change.value?.id ?? `${entry.id}:${entry.time}:${change.field}`;
      enqueue(change.value?.from?.id ?? key, async () => {
        if (await alreadySeen(key, body.object, change)) return;
        await handleChange(change).catch((err) => logFailure(key, err));
      });
    }
  }

  const pending = [...lanes.values()];
  const worker = async () => {
    for (let lane = pending.shift(); lane; lane = pending.shift()) {
      for (const task of lane) {
        // Uma pessoa com problema nao pode derrubar as outras filas.
        await task().catch((err) => console.error("[webhook] tarefa falhou:", err));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(WEBHOOK_CONCURRENCY, pending.length) }, worker));

  async function alreadySeen(dedupeKey: string, object: string | undefined, payload: unknown) {
    const now = Date.now();
    // Checa cache na RAM primeiro — descarta reentregas instantaneamente
    if (seenDedupeKeys.has(dedupeKey)) return true;

    // Limpa chaves antigas se o mapa crescer muito
    if (seenDedupeKeys.size > 1000) {
      for (const [k, ts] of seenDedupeKeys) {
        if (now - ts > 10 * 60_000) seenDedupeKeys.delete(k);
      }
    }
    seenDedupeKeys.set(dedupeKey, now);

    const { error } = await supabase
      .from("mc_webhook_events")
      .insert({ dedupe_key: dedupeKey, object: object ?? null, payload: payload as object });
    // 23505 = chave duplicada, ou seja, o Meta reentregou. Ja tratamos antes.
    return Boolean(error && error.code === "23505");
  }

  async function logFailure(dedupeKey: string, err: unknown) {
    console.error("[webhook]", dedupeKey, err);
    await supabase
      .from("mc_webhook_events")
      .update({ error: err instanceof Error ? err.message : String(err) })
      .eq("dedupe_key", dedupeKey);
  }
}

async function loadTriggers(accountId: string, kind: TriggerKind): Promise<Trigger[]> {
  const cacheKey = `${accountId}:${kind}`;
  const cached = triggersCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 30_000) {
    return cached.triggers;
  }

  const { data } = await db()
    .from("mc_triggers")
    .select("*")
    .eq("account_id", accountId)
    .eq("kind", kind)
    .eq("enabled", true);

  const triggers = (data ?? []) as Trigger[];
  triggersCache.set(cacheKey, { triggers, at: Date.now() });
  return triggers;
}

async function loadFlow(flowId: string): Promise<Flow | null> {
  const cached = flowCache.get(flowId);
  if (cached && Date.now() - cached.at < 30_000) {
    return cached.flow;
  }

  const { data } = await db().from("mc_flows").select("*").eq("id", flowId).maybeSingle();
  const flow = data && data.status === "live" ? (data as Flow) : null;
  flowCache.set(flowId, { flow, at: Date.now() });
  return flow;
}

// --- DMs -------------------------------------------------------------------

async function handleMessaging(event: MessagingEvent) {
  // Echo = mensagem que NOS enviamos, refletida de volta. Ignorar.
  if (event.message?.is_echo || event.message?.is_deleted) return;

  // Confirmacao de leitura: e o degrau "abriu" do funil. Marca tudo que foi
  // enviado ate o mid lido, porque o Instagram avisa a leitura mais recente e
  // nao uma por mensagem.
  if (event.read) {
    const account = await getAccount();
    const igsid = event.sender?.id;
    if (!igsid) return;

    const { data: contact } = await db()
      .from("mc_contacts")
      .select("id")
      .eq("account_id", account.id)
      .eq("igsid", igsid)
      .maybeSingle();
    if (!contact) return;

    const { data: conversation } = await db()
      .from("mc_conversations")
      .select("id")
      .eq("account_id", account.id)
      .eq("contact_id", contact.id)
      .maybeSingle();
    if (!conversation) return;

    await db()
      .from("mc_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("direction", "out")
      .is("read_at", null);
    return;
  }

  if (event.reaction) return;

  const igsid = event.sender?.id;
  if (!igsid) return;

  const account = await getAccount();
  // Se o remetente e a propria conta, nao e uma DM recebida.
  if (igsid === account.ig_user_id) return;

  const contact = await upsertContact(account.id, igsid);
  const conversation = await getOrCreateConversation(account.id, contact.id);

  const text = event.message?.text ?? event.postback?.title ?? "";
  // Clique em botao fixo chega como postback. O quick_reply so continua sendo
  // lido para os quick replies enviados antes da troca, que ainda podem estar
  // na tela de alguem.
  const payload = event.postback?.payload ?? event.message?.quick_reply?.payload ?? null;
  const isStoryReply = Boolean(event.message?.reply_to?.story);

  await recordMessage({
    accountId: account.id,
    conversationId: conversation.id as string,
    direction: "in",
    sender: "contact",
    mid: event.message?.mid ?? event.postback?.mid ?? null,
    type: isStoryReply ? "story_reply" : event.message?.attachments?.length ? "attachment" : "text",
    text: text || null,
    attachments: event.message?.attachments ?? null,
    payload: payload ? { payload } : null,
  });

  // Botao carrega o payload "flow:<id>" para continuar, ou
  // "flow:<id>@<no>" para retomar num ponto especifico. E o "@<no>" que evita
  // reenviar as mensagens que ja sairam antes do botao — o "ja te segui", por
  // exemplo, volta direto para o portao.
  if (payload?.startsWith("flow:")) {
    const [flowId, resumeNodeId] = payload.slice(5).split("@");
    const flow = await loadFlow(flowId);
    if (flow) {
      if (await isRepeatedTap(contact.id, conversation.id as string, flow, payload)) {
        console.log(`[webhook] toque repetido em ${payload} ignorado (contato ${contact.id}).`);
        return;
      }
      // Fluxos criados antes do "@<no>" mandam so "flow:<id>". Quem toca num
      // botao desses quer que a condicao seja reavaliada — nao rever as
      // mensagens que vieram antes dela. Entao a retomada cai na primeira
      // condicao do fluxo, se houver.
      const resumeAt =
        resumeNodeId || flow.nodes?.find((n) => n.type === "condition")?.id || null;

      await runFlow(flow, {
        accountId: account.id,
        contactId: contact.id,
        igsid,
        conversationId: conversation.id as string,
        lastText: text,
        source: "dm",
        sourceRef: event.message?.mid ?? event.postback?.mid ?? null,
        startNodeId: resumeAt,
      });
      return;
    }
  }

  const kinds: TriggerKind[] = isStoryReply
    ? ["story_reply", "dm_keyword", "default_reply"]
    : ["dm_keyword", "default_reply"];

  for (const kind of kinds) {
    const triggers = await loadTriggers(account.id, kind);
    if (!triggers.length) continue;

    const chosen =
      kind === "default_reply"
        ? triggers.sort((a, b) => b.priority - a.priority)[0]
        : pickTrigger(triggers, text);
    if (!chosen) continue;

    const flow = await loadFlow(chosen.flow_id);
    if (!flow) continue;

    await runFlow(flow, {
      accountId: account.id,
      contactId: contact.id,
      igsid,
      conversationId: conversation.id as string,
      lastText: text,
      source: isStoryReply ? "story" : "dm",
      sourceRef: event.message?.mid ?? event.postback?.mid ?? null,
      triggerId: chosen.id,
    });
    return;
  }
}

// --- Comentarios -> DM -----------------------------------------------------

async function handleChange(change: ChangeEvent) {
  if (change.field !== "comments" && change.field !== "live_comments") return;

  const value = change.value;
  const commentId = value?.id;
  if (!commentId) return;

  const account = await getAccount();

  // Nosso proprio comentario (inclusive as respostas que o bot posta). Ignorar,
  // senao entramos em loop respondendo a nos mesmos.
  if (value?.from?.id && value.from.id === account.ig_user_id) return;

  const supabase = db();
  const text = value?.text ?? "";
  const mediaId = value?.media?.id ?? null;

  const { data: recorded, error: insertError } = await supabase
    .from("mc_comment_events")
    .insert({
      account_id: account.id,
      comment_id: commentId,
      parent_comment_id: value?.parent_id ?? null,
      media_id: mediaId,
      from_igsid: value?.from?.id ?? null,
      from_username: value?.from?.username ?? null,
      text,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") return; // comentario ja processado
    throw new Error(insertError.message);
  }

  const triggers = await loadTriggers(account.id, "comment_keyword");
  const chosen = pickTrigger(triggers, text, { mediaId });
  if (!chosen) return;

  await supabase
    .from("mc_comment_events")
    .update({ matched_trigger_id: chosen.id })
    .eq("id", recorded.id);

  // Resposta publica embaixo do comentario (opcional, sorteia entre as variacoes
  // pra nao ficar obvio que e bot).
  if (chosen.public_reply_enabled && chosen.public_reply_texts.length) {
    const pick =
      chosen.public_reply_texts[Math.floor(Math.random() * chosen.public_reply_texts.length)];
    try {
      await replyToComment(commentId, pick);
      await supabase.from("mc_comment_events").update({ public_replied: true }).eq("id", recorded.id);
    } catch (err) {
      console.error("[comment] resposta publica falhou:", err);
    }
  }

  const flow = await loadFlow(chosen.flow_id);
  if (!flow) return;

  // "so na primeira vez": nao redispara pra quem ja recebeu esse fluxo.
  const fromIgsid = value?.from?.id ?? null;
  let contactId: string;
  if (fromIgsid) {
    const contact = await upsertContact(account.id, fromIgsid, {
      username: value?.from?.username ?? null,
    });
    contactId = contact.id;

    if (chosen.only_first_time) {
      const { count } = await supabase
        .from("mc_flow_runs")
        .select("id", { count: "exact", head: true })
        .eq("flow_id", flow.id)
        .eq("contact_id", contactId)
        .eq("status", "done");
      if ((count ?? 0) > 0) return;
    }
  } else {
    // Sem o ID do autor, criamos o contato depois que a private reply responder
    // com o recipient_id. Ate la usamos um placeholder ligado ao comentario.
    const contact = await upsertContact(account.id, `pending:${commentId}`, {
      username: value?.from?.username ?? null,
    });
    contactId = contact.id;
  }

  const result = await runFlow(flow, {
    accountId: account.id,
    contactId,
    igsid: fromIgsid,
    commentId,
    lastText: text,
    source: "comment",
    sourceRef: commentId,
    triggerId: chosen.id,
  });

  await supabase
    .from("mc_comment_events")
    .update({ dm_sent: result.ok, error: result.error ?? null })
    .eq("id", recorded.id);
}
