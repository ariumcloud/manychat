import { db } from "../supabase";
import {
  getOrCreateConversation,
  recordMessage,
  refreshContactProfile,
  upsertContact,
} from "../repo";
import {
  MetaError,
  sendButtons,
  sendImage,
  sendPrivateReply,
  sendText,
  type QuickReply,
} from "../meta/client";
import { appBaseUrl, createTrackedLink } from "../links";
import type { Flow, FlowEdge, FlowNode } from "./types";

/**
 * Em serverless a funcao morre junto com a resposta, entao delays longos nao
 * sobrevivem. Passando disso, o passo e registrado e pulado.
 */
const MAX_DELAY_SECONDS = 8;
const MAX_STEPS = 40;

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

function toQuickReplies(options?: Array<{ label: string; payload: string }>): QuickReply[] | undefined {
  if (!options?.length) return undefined;
  return options.map((o) => ({ title: o.label, payload: o.payload }));
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
  let contactId = ctx.contactId;
  let commentToUse = ctx.commentId ?? null;
  let steps = 0;
  // Marcado quando a API nao soube dizer se a pessoa segue; vai pro log do run.
  let unknownFollowStatus = false;

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
   * A primeira mensagem de um fluxo vindo de comentario sai como private reply
   * (recipient.comment_id). A resposta traz o recipient_id, que e o IGSID da
   * pessoa - e a partir dai as proximas mensagens vao normalmente.
   */
  const deliver = async (
    text: string,
    quickReplies?: QuickReply[],
    nodeId?: string,
  ): Promise<void> => {
    if (commentToUse) {
      const res = await sendPrivateReply(commentToUse, text, quickReplies);
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
        text,
        mid: res.message_id ?? null,
        flowId: flow.id,
        payload: { nodeId, via: "private_reply" },
      });
      return;
    }

    if (!igsid) throw new Error("Sem IGSID para enviar a mensagem.");
    const res = await sendText(igsid, text, quickReplies);
    const convId = await ensureConversation();
    await recordMessage({
      accountId: ctx.accountId,
      conversationId: convId,
      direction: "out",
      sender: "bot",
      text,
      mid: res.message_id ?? null,
      flowId: flow.id,
      payload: { nodeId },
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
        follows = fresh.followsUs;
      }

      // null = a API nao informou. Tratamos como "nao segue" para o portao
      // continuar fechado, mas registramos para dar pra diagnosticar depois.
      if (follows === null) {
        unknownFollowStatus = true;
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

  try {
    while (node && steps < MAX_STEPS) {
      let handle: string | undefined;

      switch (node.type) {
        case "trigger":
          break;

        case "text":
          if (node.data.text) await deliver(node.data.text, undefined, node.id);
          break;

        case "quickReplies":
          if (node.data.text) {
            await deliver(node.data.text, toQuickReplies(node.data.options), node.id);
          }
          break;

        case "image": {
          if (!node.data.url) break;
          if (commentToUse) {
            // Private reply so aceita texto; manda a legenda primeiro pra abrir a conversa.
            await deliver(node.data.text || "  ", undefined, node.id);
          }
          // Sem IGSID nao da para anexar nada. Falhar aqui e melhor do que
          // marcar o run como concluido tendo entregue so o texto.
          if (!igsid) throw new Error("Sem IGSID para enviar a imagem.");

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
          const buttons = await Promise.all(
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
          let textAlreadySent = false;
          if (commentToUse) {
            // Template exige recipient.id: abre a conversa com o texto primeiro.
            await deliver(node.data.text || "  ", undefined, node.id);
            textAlreadySent = true;
          }
          if (buttons.length) {
            if (!igsid) throw new Error("Sem IGSID para enviar os botoes.");
            const text = node.data.text ?? " ";
            try {
              const res = await sendButtons(igsid, text, buttons);
              const convId = await ensureConversation();
              await recordMessage({
                accountId: ctx.accountId,
                conversationId: convId,
                direction: "out",
                sender: "bot",
                type: "template",
                text: node.data.text ?? null,
                mid: res.message_id ?? null,
                payload: { buttons },
                flowId: flow.id,
              });
            } catch (err) {
              // O template e o unico jeito de ter botao de verdade, mas se o
              // Instagram recusar (link invalido, template indisponivel) nao da
              // para simplesmente perder a mensagem: a pessoa ficaria com o
              // "toque no botao abaixo" e nenhum botao. Manda em texto:
              // os links entram no corpo, os de postback viram quick reply.
              if (!(err instanceof MetaError)) throw err;
              console.error("[flow] template recusado, caindo para texto:", err.message);

              const urls = buttons.flatMap((b) => (b.type === "web_url" ? [b.url] : []));
              const replies = buttons.flatMap((b) =>
                b.type === "postback" ? [{ title: b.title, payload: b.payload }] : [],
              );
              // O texto ja saiu como private reply neste caso; repetir seria uma
              // mensagem duplicada. Mas quick reply nao existe sem mensagem —
              // se e so isso que sobrou, o texto vai junto.
              const parts = [textAlreadySent ? "" : text, ...urls].filter(Boolean);
              const fallbackText = parts.join("\n\n") || (replies.length ? text : "");

              if (fallbackText) {
                await deliver(fallbackText, replies.length ? replies : undefined, node.id);
              }
            }
          }
          break;
        }

        case "delay": {
          const seconds = Math.min(node.data.seconds ?? 1, MAX_DELAY_SECONDS);
          await new Promise((r) => setTimeout(r, seconds * 1000));
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
