import crypto from "node:crypto";
import { db } from "./supabase";
import { hashPassword } from "./password";
import { PENDING_PREFIX } from "./meta/token";

/** Login de cliente: e-mail ou apelido, sempre em minusculas. */
export const LOGIN_RE = /^[a-z0-9._@+-]{3,80}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export type CreateClientResult =
  | { ok: true; accountId: string; login: string }
  | { ok: false; status: number; error: string };

/**
 * Cria o painel de um cliente: login + senha. O Instagram ele conecta depois,
 * logado (OAuth). Ate la a conta guarda um ig_user_id "pending:" no lugar.
 */
export async function createClientAccount(input: {
  login: string;
  password: string;
  name?: string | null;
}): Promise<CreateClientResult> {
  const login = input.login.trim().toLowerCase();

  if (!LOGIN_RE.test(login)) {
    return {
      ok: false,
      status: 400,
      error: "Use um e-mail ou login de 3 a 80 caracteres (letras, números e . _ @ + -).",
    };
  }
  if (input.password.length < MIN_PASSWORD) {
    return { ok: false, status: 400, error: `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.` };
  }

  const { data, error } = await db()
    .from("mc_accounts")
    .insert({
      ig_user_id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      login,
      password_hash: hashPassword(input.password),
      name: input.name?.trim() || null,
    })
    .select("id, login")
    .single();

  if (error) {
    const taken = error.code === "23505";
    return {
      ok: false,
      status: taken ? 409 : 500,
      error: taken ? "Esse e-mail/login já está cadastrado." : error.message,
    };
  }
  return { ok: true, accountId: data.id, login: data.login };
}
