import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

function make() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "manychat" },
  });
}

let cached: ReturnType<typeof make> | null = null;

/**
 * Cliente com service_role, escopado no schema `manychat`.
 * SÓ pode ser usado em código de servidor — nunca importe isto num "use client".
 */
export function db() {
  if (!cached) cached = make();
  return cached;
}
