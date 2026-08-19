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
  baseUrl: string;
}): Promise<string> {
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

/** URL pública da própria aplicação, para montar o link rastreado. */
export function appBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // A Vercel expõe o domínio de produção aqui.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
