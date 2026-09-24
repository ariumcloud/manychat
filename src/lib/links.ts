import crypto from "node:crypto";
import { db } from "./supabase";

/**
 * O Instagram só avisa clique em botão de postback — clique em link externo
 * nunca volta pra gente. Para medir de verdade, o botão aponta para /r/<token>
 * no nosso domínio, que registra e redireciona.
 *
 * Sem isto o funil para em "DM entregue" e o número que interessa (quantos
 * clicaram) não existe.
 */
export async function createTrackedLink(input: {
  accountId: string;
  url: string;
  contactId?: string | null;
  flowId?: string | null;
  triggerId?: string | null;
  baseUrl: string | null;
}): Promise<string> {
  // Sem domínio público não dá para rastrear: um link "localhost" dentro da DM
  // é pior do que não medir — o Instagram recusa o botão e a pessoa fica sem o
  // link. Manda o destino original e segue o jogo.
  if (!input.baseUrl) return input.url;

  const token = crypto.randomBytes(9).toString("base64url");

  const { error } = await db().from("mc_links").insert({
    token,
    account_id: input.accountId,
    contact_id: input.contactId ?? null,
    flow_id: input.flowId ?? null,
    trigger_id: input.triggerId ?? null,
    url: input.url,
  });

  // Rastreio é secundário: se falhar, é melhor mandar o link original do que
  // não mandar mensagem nenhuma.
  if (error) {
    console.error("[links] não consegui criar link rastreado:", error.message);
    return input.url;
  }

  return `${input.baseUrl.replace(/\/$/, "")}/r/${token}`;
}

/**
 * Domínio dos links rastreados, ou `null` para mandar o link original.
 *
 * Desligado por padrão. Em 24/09/2026 o Instagram passou a recusar toda DM
 * com link `manychat-murex.vercel.app/r/…` ("We limit how often you can
 * post…"), inclusive enviada à mão, enquanto as mesmas mensagens sem link
 * saíam. `*.vercel.app` é domínio compartilhado e de reputação ruim; 125 links
 * dele em DM num dia bastaram. Por isso o rastreio só liga com um domínio
 * próprio em LINK_TRACKING_BASE_URL — e nunca num vercel.app.
 */
export function trackingBaseUrl(): string | null {
  const raw = process.env.LINK_TRACKING_BASE_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");
  try {
    if (new URL(base).hostname.endsWith(".vercel.app")) {
      console.warn("[links] LINK_TRACKING_BASE_URL em vercel.app ignorada; mandando o link original.");
      return null;
    }
  } catch {
    console.warn("[links] LINK_TRACKING_BASE_URL inválida; mandando o link original.");
    return null;
  }
  return base;
}
