import { db } from "../supabase";
import {
  getOrCreateConversation,
  recordMessage,
  refreshContactProfile,
  upsertContact,
  windowIsOpen,
} from "../repo";
import {
  MetaError,
  sendButtons,
  sendGeneric,
  sendImage,
  sendPrivateReply,
  sendText,
  type GenericElement,
  type TemplateButton,
} from "../meta/client";
import { createTrackedLink, trackingBaseUrl } from "../links";
import { CATALOG_LIMITS, cardHandle, type CatalogItem } from "../catalog";
import type { Flow, FlowEdge, FlowNode } from "./types";

/**
 * Em serverless a funcao morre junto com a resposta, entao delays longos nao
 * sobrevivem. Passando disso, o passo e registrado e pulado.
 */
const MAX_DELAY_SECONDS = 8;
const MAX_STEPS = 40;

/**
 * Teto de duracao do runFlow inteiro, com margem sob o maxDuration=60s da
 * function (ver route.ts). Sem isso, um fluxo com varios delays + uma chamada
 * ao Supabase que demora (o projeto e compartilhado com outros produtos e o
 * PostgREST vem sofrendo timeout sob carga alheia) so morre pelo teto da
 * Vercel — sem gravar erro, sem status final, sem log. Aqui o proprio fluxo
 * se encerra antes disso, de forma limpa.
 */
const RUN_DEADLINE_MS = 45_000;

/**
 * Pausa aleatoria antes de cada DM (fora a resposta ao comentario, que ja leva
 * uns 6s). O suporte da Meta orientou evitar muitas mensagens e ritmo de robo;
 * em 24/09/2026 a conta tomou bloqueio de links em DM. Ajustavel por
 * DM_PAUSE_MS="min,max" (em ms).
 */
function dmPauseRange(): [number, number] {
  const [min, max] = (process.env.DM_PAUSE_MS ?? "3000,8000").split(",").map(Number);
  return Number.isFinite(min) && Number.isFinite(max) && max >= min ? [min, max] : [3000, 8000];
}

/** Uma pausa nunca empurra o fluxo para perto do teto de tempo. */
const PAUSE_SAFETY_MS = 12_000;

/** Pediu para seguir de novo ha menos disto: manda o lembrete curto. */
const ASK_AGAIN_WINDOW_MS = 10 * 60_000;
/** Lembrete ha menos disto e ainda nao segue: fica quieto. */
const NUDGE_COOLDOWN_MS = 60_000;

/** Rotulos do botao de link (Instagram: ate 20 caracteres). */
const LINK_BUTTON_TITLES = ["Abrir link", "Acessar", "Ver conteúdo", "Abrir aqui 👉", "Acessar agora"];

const NUDGE_TEXTS = [
  "Ainda não apareceu aqui que você me segue 👀 Segue lá e toca de novo no botão acima 👆",
  "Hmm, ainda não achei seu follow 🤔 Me segue e toca no botão de novo 👆",
  "Quase! Ainda não tá aparecendo que você me segue. Segue e tenta de novo no botão 👆",
  "Opa, seu follow ainda não caiu aqui 👀 às vezes demora uns segundinhos, tenta de novo 👆",
];

export type RunContext = {
  accountId: string;
  contactId: string;
  /** Instagram-scoped ID. Pode chegar vazio quando o gatilho foi um comentario. */
  igsid?: string | null;
  /** Se presente, a PRIMEIRA mensagem sai como private reply do comentario. */
  commentId?: string | null;
  conversationId?: string | null;
  /** Texto que disparou o fluxo (usado em condicoes). */
  lastText?: string;
  source: "comment" | "dm" | "story" | "manual";
  sourceRef?: string | null;
  triggerId?: string | null;
  /**
   * Retoma o fluxo neste no em vez de comecar do gatilho. E o que faz o botao
   * "ja te segui" voltar direto para o portao — sem isto o fluxo reexecuta do
   * inicio e a mensagem-ponte sai de novo.
   */
  startNodeId?: string | null;
};

type SendResult = Awaited<ReturnType<typeof sendText>>;

export type RunResult = {
  ok: boolean;
  steps: number;
  igsid: string | null;
  error?: string;
};

/**
 * "We limit how often you can post, comment or do other things…": o Instagram
 * barrando a acao. Em 24/09/2026 veio para DMs com link no texto (qualquer
 * dominio); com o link dentro de botao, passou.
 */
function isLinkBlock(err: unknown) {
  return err instanceof MetaError && /we limit how often/i.test(err.message);
}

/** Texto do no, sorteado entre o principal e as variacoes nao vazias. */
function pickText(node: FlowNode): string {
  const options = [node.data.text, ...(node.data.textVariants ?? [])].filter(
    (t): t is string => Boolean(t?.trim()),
  );
  return options.length ? options[Math.floor(Math.random() * options.length)] : "";
}

function startNode(flow: Flow, startNodeId?: string | null): FlowNode | null {
  const nodes = flow.nodes ?? [];
  if (startNodeId) {
    const resume = nodes.find((n) => n.id === startNodeId);
    if (resume) return resume;
  }
  const trigger = nodes.find((n) => n.type === "trigger");
  if (trigger) return trigger;
  const targets = new Set((flow.edges ?? []).map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? nodes[0] ?? null;
}

function nextNode(flow: Flow, from: FlowNode, handle?: string): FlowNode | null {
  const edges: FlowEdge[] = flow.edges ?? [];
  // Com handle ("yes"/"no") a saida e exata: se aquele ramo nao esta ligado, o
  // fluxo acaba ali. Cair na outra saida mandaria o pedido de seguir para quem
  // ja segue — exatamente o contrario do que a condicao decidiu.
  const edge = handle
    ? edges.find((e) => e.source === from.id && e.sourceHandle === handle)
    : edges.find((e) => e.source === from.id);
  if (!edge) return null;
  return (flow.nodes ?? []).find((n) => n.id === edge.target) ?? null;
}

/** Executa um fluxo do inicio ao fim, gravando cada mensagem enviada. */
export async function runFlow(flow: Flow, ctx: RunContext): Promise<RunResult> {
  const supabase = db();

  const { data: run } = await supabase
    .from("mc_flow_runs")
    .insert({
      account_id: ctx.accountId,
      flow_id: flow.id,
      trigger_id: ctx.triggerId ?? null,
      contact_id: ctx.contactId,
      source: ctx.source,
      source_ref: ctx.sourceRef ?? null,
    })
    .select()
    .single();

  let igsid = ctx.igsid ?? null;
  let conversationId = ctx.conversationId ?? null;
  // Janela de 24h do Meta. A private reply de um comentario e a UNICA mensagem
  // permitida enquanto a pessoa nao responder: qualquer envio seguinte volta
  // "This message is sent outside of allowed window" (403). Saber disso aqui
  // evita bater na API para levar erro — e da para explicar direito no log.
  let windowOpen = false;
  let contactId = ctx.contactId;
  let commentToUse = ctx.commentId ?? null;
  let steps = 0;
  // Marcado quando a API nao soube dizer se a pessoa segue; vai pro log do run.
  let unknownFollowStatus = false;
  // Portao "te segue?" avaliado antes de existir conversa: fica guardado para
  // ser refeito assim que a primeira mensagem abrir a conversa.
  let pendingFollowGate: FlowNode | null = null;

  const finish = async (status: string, error?: string) => {
    if (run) {
      await supabase
        .from("mc_flow_runs")
        .update({
          status,
          error: error ?? null,
          steps_executed: steps,
          finished_at: new Date().toISOString(),
          ...(unknownFollowStatus && !error
            ? { error: "Aviso: a API nao informou se a pessoa te segue; tratei como nao seguidor." }
            : {}),
        })
        .eq("id", run.id);
    }
    if (status === "done") {
      await supabase
        .from("mc_flows")
        .update({ sent_count: (flow.sent_count ?? 0) + 1 })
        .eq("id", flow.id);
    }
    return { ok: status === "done", steps, igsid, error } satisfies RunResult;
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const conv = await getOrCreateConversation(ctx.accountId, contactId);
    conversationId = conv.id as string;
    return conversationId;
  };

  /**
   * Pode mandar mensagem livre para este contato agora?
   * So se a pessoa nos escreveu nas ultimas 24h — ou se ainda temos a private
   * reply do comentario na mao, que e o unico envio que dispensa a janela.
   */
  const canSendFreeform = async () => {
    if (commentToUse) return true;
    if (windowOpen) return true;
    const { data } = await supabase
      .from("mc_conversations")
      .select("window_expires_at")
      .eq("account_id", ctx.accountId)
      .eq("contact_id", contactId)
      .maybeSingle();
    windowOpen = windowIsOpen(data?.window_expires_at);
    return windowOpen;
  };

  const CAROUSEL_IN_COMMENT =
    "Carrossel nao sai como resposta a comentario. Coloque-o depois de um botao " +
    "(ex.: o \"JA TE SEGUI\"), quando a conversa ja estiver aberta.";

  const OUT_OF_WINDOW =
    "Fora da janela de 24h do Instagram: depois da primeira resposta ao comentario, " +
    "so da para mandar de novo se a pessoa te responder. Deixe o fluxo do comentario " +
    "com uma mensagem so.";

  /**
   * A primeira mensagem de um fluxo vindo de comentario sai como private reply
   * (recipient.comment_id). A resposta traz o recipient_id, que e o IGSID da
   * pessoa - e a partir dai as proximas mensagens vao normalmente.
   *
   * Com botoes, a mensagem sai como card de botao fixo — inclusive na private
   * reply, que e a unica mensagem permitida antes de a pessoa responder: texto
   * e botao precisam ir juntos.
   */
  const deliver = (text: string, nodeId?: string, buttons?: TemplateButton[]) =>
    deliverMessage({
      text,
      type: buttons?.length ? "template" : "text",
      payload: buttons?.length ? { nodeId, buttons } : { nodeId },
      toComment: (commentId) => sendPrivateReply(commentId, text, buttons),
      toUser: (id) => (buttons?.length ? sendButtons(id, text, buttons) : sendText(id, text)),
    });

  /**
   * Envio de qualquer formato de mensagem. `toComment` e usado enquanto a
   * private reply ainda nao saiu; `toUser` depois. `text` e o que fica gravado
   * no inbox.
   */
  const humanPause = async () => {
    const [min, max] = dmPauseRange();
    const remaining = RUN_DEADLINE_MS - (Date.now() - startedAt) - PAUSE_SAFETY_MS;
    const ms = Math.min(min + Math.random() * (max - min), remaining);
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  };

  const deliverMessage = async (msg: {
    text: string;
    type: string;
    payload: Record<string, unknown>;
    toComment: (commentId: string) => Promise<SendResult>;
    toUser: (igsid: string) => Promise<SendResult>;
  }): Promise<void> => {
    const { text, type, payload } = msg;

    if (commentToUse) {
      const res = await msg.toComment(commentToUse);
      commentToUse = null;

      // O id que vem no webhook de comentario nem sempre e o mesmo que a API de
      // mensagens usa. O recipient_id da private reply e o oficial: e com ele
      // que da para consultar o perfil (e o "te segue?") e enviar o resto. Por
      // isso ele vale mais do que o id do comentario, e nao so quando falta um.
      if (res.recipient_id && res.recipient_id !== igsid) {
        igsid = res.recipient_id;
        const placeholderId = contactId;
        const contact = await upsertContact(ctx.accountId, igsid);
        contactId = contact.id;
        conversationId = null;

        if (placeholderId !== contactId) {
          if (run) {
            await supabase.from("mc_flow_runs").update({ contact_id: contactId }).eq("id", run.id);
          }

          // O contato "pending:<comment_id>" criado la no webhook so existia ate
          // sabermos quem e de verdade. Um contato real fica onde esta.
          const { data: old } = await supabase
            .from("mc_contacts")
            .select("igsid")
            .eq("id", placeholderId)
            .maybeSingle();

          if (old?.igsid?.startsWith("pending:")) {
            await supabase.from("mc_contacts").delete().eq("id", placeholderId);
          }
        }
      }
      const convId = await ensureConversation();
      await recordMessage({
        accountId: ctx.accountId,
        conversationId: convId,
        direction: "out",
        sender: "bot",
        type,
        text,
        mid: res.message_id ?? null,
        flowId: flow.id,
        payload: { ...payload, via: "private_reply" },
      });
      return;
    }

    if (!igsid) throw new Error("Sem IGSID para enviar a mensagem.");
    if (!(await canSendFreeform())) throw new Error(OUT_OF_WINDOW);
    await humanPause();
    const res = await msg.toUser(igsid);
    const convId = await ensureConversation();
    await recordMessage({
      accountId: ctx.accountId,
      conversationId: convId,
      direction: "out",
      sender: "bot",
      type,
      text,
      mid: res.message_id ?? null,
      flowId: flow.id,
      payload,
    });
  };

  const evaluateCondition = async (node: FlowNode): Promise<boolean> => {
    const { field, op, value } = node.data;
    if (field === "last_text") {
      return (ctx.lastText ?? "").toLowerCase().includes((value ?? "").toLowerCase());
    }
    if (field === "has_tag") {
      const { data: tag } = await supabase
        .from("mc_tags")
        .select("id")
        .eq("account_id", ctx.accountId)
        .eq("name", value ?? "")
        .maybeSingle();
      if (!tag) return false;
      const { data: link } = await supabase
        .from("mc_contact_tags")
        .select("contact_id")
        .eq("contact_id", contactId)
        .eq("tag_id", tag.id)
        .maybeSingle();
      return Boolean(link);
    }

    const { data: contact } = await supabase
      .from("mc_contacts")
      .select("is_user_follow_business, follower_count")
      .eq("id", contactId)
      .maybeSingle();
    if (!contact) return false;

    if (field === "is_user_follow_business") {
      // Sempre rebusca: seguir/deixar de seguir muda a qualquer momento, e o
      // botao "ja te segui" depende de ver o estado AGORA, nao o do cadastro.
      let follows: boolean | null =
        typeof contact.is_user_follow_business === "boolean"
          ? contact.is_user_follow_business
          : null;

      if (igsid) {
        const fresh = await refreshContactProfile(contactId, igsid);
        // So substitui quando a API realmente respondeu. Um "nao sei" nao pode
        // apagar um "segue" que ja tinhamos conferido antes — e e exatamente
        // isso que devolve o conteudo direto a quem ja passou pelo portao.
        if (fresh.followsUs !== null) follows = fresh.followsUs;
      }

      // null = a API nao informou. Tratamos como "nao segue" para o portao
      // continuar fechado.
      if (follows === null) {
        if (commentToUse) {
          // Esperado: num comentario ainda nao existe conversa, e sem conversa o
          // Instagram nao responde "te segue?". Nao e erro — e a deixa para
          // refazer a pergunta assim que a primeira mensagem abrir a conversa.
          pendingFollowGate = node;
        } else {
          // Aqui a conversa ja existe e mesmo assim nao veio resposta. Isso sim
          // vai pro log, para dar pra diagnosticar depois.
          unknownFollowStatus = true;
        }
        follows = false;
      }

      return op === "is_false" ? !follows : follows;
    }
    if (field === "follower_count") {
      const n = contact.follower_count ?? 0;
      const target = Number(value ?? 0);
      return op === "lt" ? n < target : n > target;
    }
    return false;
  };

  /**
   * Carrossel do catalogo (generic template). Botao "url" vira link rastreado;
   * botao "flow" vira postback "flow:<fluxo>@<no>", com o no de destino vindo
   * da saida do card — o clique volta pelo webhook como qualquer outro botao.
   * Um card "flow" sem saida ligada vai sem botao.
   *
   * So por DM: carrossel nao sai como resposta a comentario. Num fluxo de
   * comentario ele vem depois de um botao, quando a pessoa ja respondeu.
   */
  const sendCarousel = async (node: FlowNode) => {
    if (commentToUse) throw new Error(CAROUSEL_IN_COMMENT);
    const ids = (node.data.items ?? []).slice(0, CATALOG_LIMITS.cards);
    if (!ids.length) return;

    const { data, error } = await supabase
      .from("mc_catalog_items")
      .select("*")
      .eq("account_id", ctx.accountId)
      .in("id", ids);
    if (error) throw new Error(`Nao consegui carregar o catalogo: ${error.message}`);

    const byId = new Map(((data ?? []) as CatalogItem[]).map((i) => [i.id, i]));
    const items = ids.flatMap((id) => byId.get(id) ?? []);
    if (!items.length) throw new Error("Nenhum item do carrossel existe mais no catalogo.");

    const elements: GenericElement[] = await Promise.all(
      items.map(async (item) => {
        let button: TemplateButton | null = null;
        if (item.button_action === "url" && item.button_url) {
          button = {
            type: "web_url",
            title: item.button_label,
            url: await createTrackedLink({
              accountId: ctx.accountId,
              url: item.button_url,
              contactId,
              flowId: flow.id,
              triggerId: ctx.triggerId ?? null,
              baseUrl: trackingBaseUrl(),
            }),
          };
        } else if (item.button_action === "flow") {
          const edge = (flow.edges ?? []).find(
            (e) => e.source === node.id && e.sourceHandle === cardHandle(item.id),
          );
          if (edge) {
            button = {
              type: "postback",
              title: item.button_label,
              payload: `flow:${flow.id}@${edge.target}`,
            };
          } else {
            console.warn(`[flow] card "${item.title}" sem saida ligada; vai sem botao.`);
          }
        }
        return {
          title: item.title,
          subtitle: item.subtitle ?? undefined,
          image_url: item.image_url,
          buttons: button ? [button] : [],
        };
      }),
    );

    await deliverMessage({
      text: `🛍️ ${items.map((i) => i.title).join(" · ")}`,
      type: "template",
      payload: { nodeId: node.id, elements },
      toComment: () => Promise.reject(new Error(CAROUSEL_IN_COMMENT)),
      toUser: (id) => sendGeneric(id, elements),
    });
  };

  /**
   * "ask": manda o pedido completo; "nudge": ja pediu ha pouco, manda o
   * lembrete; "silent": ja lembrou ha menos de 1 minuto.
   */
  const askAgainOrNudge = async (node: FlowNode): Promise<"ask" | "nudge" | "silent"> => {
    const convId = await ensureConversation();
    const { data } = await supabase
      .from("mc_messages")
      .select("created_at, payload")
      .eq("conversation_id", convId)
      .eq("direction", "out")
      .eq("payload->>nodeId", node.id)
      .gte("created_at", new Date(Date.now() - ASK_AGAIN_WINDOW_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    const recent = (data ?? []) as Array<{ created_at: string; payload: { nudge?: boolean } | null }>;
    if (!recent.length) return "ask";
    const lastNudgeAt = Math.max(
      0,
      ...recent.filter((m) => m.payload?.nudge).map((m) => new Date(m.created_at).getTime()),
    );
    return Date.now() - lastNudgeAt < NUDGE_COOLDOWN_MS ? "silent" : "nudge";
  };

  const applyTag = async (name: string) => {
    const { data: tag } = await supabase
      .from("mc_tags")
      .upsert({ account_id: ctx.accountId, name }, { onConflict: "account_id,name" })
      .select()
      .single();
    if (tag) {
      await supabase
        .from("mc_contact_tags")
        .upsert({ contact_id: contactId, tag_id: tag.id }, { onConflict: "contact_id,tag_id" });
    }
  };

  let node = startNode(flow, ctx.startNodeId);
  if (!node) return finish("skipped", "Fluxo vazio.");

  const startedAt = Date.now();

  try {
    while (node && steps < MAX_STEPS) {
      if (Date.now() - startedAt > RUN_DEADLINE_MS) {
        return finish("failed", "Tempo do fluxo esgotado (proximo do limite da function).");
      }

      let handle: string | undefined;

      switch (node.type) {
        case "trigger":
          break;

        case "text": {
          const body = pickText(node);
          let text = body;
          let url: string | null = null;
          // Rastreado so com dominio proprio (ver trackingBaseUrl).
          if (node.data.link?.url) {
            url = await createTrackedLink({
              accountId: ctx.accountId,
              url: node.data.link.url,
              contactId,
              flowId: flow.id,
              triggerId: ctx.triggerId ?? null,
              baseUrl: trackingBaseUrl(),
            });
            text = text ? `${text}\n\n${url}` : url;
          }
          if (!text) break;
          if (!url) {
            await deliver(text, node.id);
            break;
          }
          // Link sempre dentro de botao (button template): e o formato que o
          // Instagram oferece para link em mensagem automatica. Em 24/09/2026
          // ele passou a recusar DM com link no texto, qualquer dominio, e o
          // botao seguiu passando. O rotulo e sorteado como o texto.
          const title = LINK_BUTTON_TITLES[Math.floor(Math.random() * LINK_BUTTON_TITLES.length)];
          try {
            await deliver(body.trim() || "Aqui está 👇", node.id, [{ type: "web_url", title, url }]);
          } catch (err) {
            // Card recusado por outro motivo (link invalido, por exemplo): o
            // link ainda sai no texto. O bloqueio de links nao tem essa saida.
            if (!(err instanceof MetaError) || isLinkBlock(err)) throw err;
            console.error("[flow] card com link recusado, caindo para texto:", err.message);
            await deliver(text, node.id);
          }
          break;
        }

        case "image": {
          if (!node.data.url) break;
          if (commentToUse) {
            // Private reply so aceita texto; manda a legenda primeiro pra abrir a conversa.
            await deliver(node.data.text || "  ", node.id);
          }
          // Sem IGSID nao da para anexar nada. Falhar aqui e melhor do que
          // marcar o run como concluido tendo entregue so o texto.
          if (!igsid) throw new Error("Sem IGSID para enviar a imagem.");
          if (!(await canSendFreeform())) throw new Error(OUT_OF_WINDOW);

          await humanPause();
          const res = await sendImage(igsid, node.data.url);
          const convId = await ensureConversation();
          await recordMessage({
            accountId: ctx.accountId,
            conversationId: convId,
            direction: "out",
            sender: "bot",
            type: "image",
            text: node.data.text ?? null,
            mid: res.message_id ?? null,
            attachments: [{ type: "image", url: node.data.url }],
            flowId: flow.id,
          });
          break;
        }

        case "buttons": {
          // Cada link vira um /r/<token> próprio deste envio — é assim que o
          // clique volta pra gente.
          const buttons: TemplateButton[] = await Promise.all(
            (node.data.buttons ?? []).map(async (b) =>
              b.kind === "url"
                ? ({
                    type: "web_url",
                    title: b.label,
                    url: await createTrackedLink({
                      accountId: ctx.accountId,
                      url: b.url,
                      contactId,
                      flowId: flow.id,
                      triggerId: ctx.triggerId ?? null,
                      baseUrl: trackingBaseUrl(),
                    }),
                  } as const)
                : ({ type: "postback", title: b.label, payload: b.payload } as const),
            ),
          );
          // O card exige um corpo; um espaco basta quando o no nao tem texto.
          const text = pickText(node).trim() || " ";

          // Pedido que espera toque ("JA TE SEGUI") voltando por um toque:
          // a pessoa foi reprovada no portao. O botao do pedido anterior
          // continua valendo, entao nao precisa de outro card igual — sai um
          // lembrete curto, e nada se o ultimo lembrete e de agora ha pouco.
          if (ctx.startNodeId && !commentToUse && buttons.some((b) => b.type === "postback")) {
            const nudge = await askAgainOrNudge(node);
            if (nudge === "silent") break;
            if (nudge === "nudge") {
              const t = NUDGE_TEXTS[Math.floor(Math.random() * NUDGE_TEXTS.length)];
              await deliverMessage({
                text: t,
                type: "text",
                payload: { nodeId: node.id, nudge: true },
                toComment: () => Promise.reject(new Error("Lembrete nao sai como resposta a comentario.")),
                toUser: (id) => sendText(id, t),
              });
              break;
            }
          }

          if (!buttons.length) {
            if (text.trim()) await deliver(text, node.id);
            break;
          }

          try {
            await deliver(text, node.id, buttons);
          } catch (err) {
            // Se o Instagram recusar o card (link invalido, por exemplo), os
            // links ainda podem ir no corpo da mensagem. Botao de postback nao
            // tem como sair sem o card — ai o erro sobe e aparece no log do run.
            if (!(err instanceof MetaError)) throw err;
            const urls = buttons.flatMap((b) => (b.type === "web_url" ? [b.url] : []));
            if (!urls.length) throw err;
            console.error("[flow] card de botoes recusado, caindo para texto:", err.message);
            await deliver([text.trim(), ...urls].filter(Boolean).join("\n\n"), node.id);
          }
          break;
        }

        case "delay": {
          const remainingMs = RUN_DEADLINE_MS - (Date.now() - startedAt);
          const seconds = Math.min(node.data.seconds ?? 1, MAX_DELAY_SECONDS, Math.max(0, remainingMs / 1000));
          if (seconds > 0) await new Promise((r) => setTimeout(r, seconds * 1000));
          break;
        }

        case "tag":
          if (node.data.tagName) await applyTag(node.data.tagName);
          break;

        case "condition":
          handle = (await evaluateCondition(node)) ? "yes" : "no";
          break;

        case "carousel":
          await sendCarousel(node);
          // Saida exata: as arestas dos cards sao destinos de clique, nao a
          // continuacao do fluxo. So segue na hora se "em seguida" estiver ligada.
          handle = "next";
          break;
      }

      steps += 1;

      // A primeira mensagem saiu e devolveu o IGSID real, entao agora da para
      // saber se a pessoa te segue. Se seguia, emendamos o conteudo — mas so
      // quando ainda ha permissao para mandar outra mensagem. Vindo de um
      // comentario normalmente nao ha: a private reply foi a unica cota, e o
      // conteudo sai quando a pessoa tocar no botao.
      if (pendingFollowGate && !commentToUse && igsid) {
        const gate = pendingFollowGate;
        pendingFollowGate = null;
        if ((await canSendFreeform()) && (await evaluateCondition(gate))) {
          node = nextNode(flow, gate, "yes");
          continue;
        }
      }

      node = nextNode(flow, node, handle);
    }

    return finish("done");
  } catch (err) {
    const message =
      err instanceof MetaError
        ? `${err.message} (HTTP ${err.status})`
        : err instanceof Error
          ? err.message
          : String(err);
    return finish("failed", message);
  }
}
