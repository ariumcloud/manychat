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
  sendImage,
  sendPrivateReply,
  sendText,
  type TemplateButton,
} from "../meta/client";
import { appBaseUrl, createTrackedLink } from "../links";
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

export type RunResult = {
  ok: boolean;
  steps: number;
  igsid: string | null;
  error?: string;
};

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
  const deliver = async (
    text: string,
    nodeId?: string,
    buttons?: TemplateButton[],
  ): Promise<void> => {
    const type = buttons?.length ? "template" : "text";
    const payload = buttons?.length ? { nodeId, buttons } : { nodeId };

    if (commentToUse) {
      const res = await sendPrivateReply(commentToUse, text, buttons);
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
    const res = buttons?.length
      ? await sendButtons(igsid, text, buttons)
      : await sendText(igsid, text);
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
          let text = node.data.text ?? "";
          // O link vai no corpo da mensagem, rastreado do mesmo jeito.
          if (node.data.link?.url) {
            const url = await createTrackedLink({
              accountId: ctx.accountId,
              url: node.data.link.url,
              contactId,
              flowId: flow.id,
              triggerId: ctx.triggerId ?? null,
              baseUrl: appBaseUrl(),
            });
            text = text ? `${text}\n\n${url}` : url;
          }
          if (text) await deliver(text, node.id);
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
                      baseUrl: appBaseUrl(),
                    }),
                  } as const)
                : ({ type: "postback", title: b.label, payload: b.payload } as const),
            ),
          );
          // O card exige um corpo; um espaco basta quando o no nao tem texto.
          const text = node.data.text?.trim() || " ";

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
