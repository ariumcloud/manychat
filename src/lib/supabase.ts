import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

function make() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
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
