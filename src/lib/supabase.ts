import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * O projeto Supabase e compartilhado com varios outros produtos (CRM, UTM
 * tracking, etc.) e o PostgREST dele vem derrubando threads por timeout sob
 * carga alheia (ver "Warp server error: Thread killed by timeout manager" nos
 * logs). Sem um teto aqui, uma chamada presa arrasta a invocacao inteira ate
 * o maxDuration da function — o webhook so acaba morto, sem nem gravar o erro.
 * 8s da margem pra uma query normal e ainda falha bem antes do teto de 60s.
 */
const SUPABASE_TIMEOUT_MS = 8_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function make() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}

let cached: ReturnType<typeof make> | null = null;

/**
 * Cliente com service_role.
 *
 * As tabelas do app vivem no schema `public` com prefixo `mc_`. Um schema
 * proprio seria mais limpo, mas o PostgREST so atende schemas que estejam na
 * lista de "Exposed schemas" do projeto — e isso e configuracao de painel, nao
 * de migracao. O prefixo resolve sem depender disso.
 *
 * SO pode ser usado em codigo de servidor — nunca importe isto num "use client".
 */
export function db() {
  if (!cached) cached = make();
  return cached;
}
