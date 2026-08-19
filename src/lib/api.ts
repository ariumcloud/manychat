import { NextResponse } from "next/server";
import { MetaError } from "./meta/client";

/**
 * Envolve um handler de rota para que qualquer erro vire JSON com mensagem
 * legivel. Sem isto, uma env var faltando estoura um 500 sem corpo e o painel
 * fica girando pra sempre no "carregando".
 */
export function withApi<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      const message =
        err instanceof MetaError
          ? `${err.message} (Graph API HTTP ${err.status})`
          : err instanceof Error
            ? err.message
            : String(err);

      console.error("[api]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
