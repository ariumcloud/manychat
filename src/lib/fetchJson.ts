export type JsonResult<T> = { ok: boolean; data: T | null; error: string | null };

/**
 * fetch que nunca estoura. Rede caída, 500 sem corpo, HTML de erro no lugar de
 * JSON — tudo vira `{ ok: false, error }`, para a tela mostrar o problema em vez
 * de ficar girando no "carregando".
 */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<JsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : "Não consegui falar com o servidor.",
    };
  }

  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const error = (body as { error?: string } | null)?.error;

  if (!res.ok) {
    return { ok: false, data: null, error: error ?? `O servidor respondeu ${res.status}.` };
  }
  return { ok: true, data: body as T, error: error ?? null };
}
