/**
 * Catalogo do no "Carrossel" (tabela mc_catalog_items). Tipos e regras que o
 * servidor, o editor e o motor compartilham — por isso nada aqui importa
 * Supabase.
 */

export type CatalogAction = "url" | "flow";

export type CatalogItem = {
  id: string;
  account_id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  button_label: string;
  button_action: CatalogAction;
  button_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Limites do generic template do Instagram. */
export const CATALOG_LIMITS = {
  cards: 10,
  title: 80,
  subtitle: 80,
  buttonLabel: 20,
} as const;

/**
 * Saida do no de carrossel para o card deste item. So existe para item com
 * botao "flow": e a aresta ligada nela que diz onde o clique retoma o fluxo.
 */
export function cardHandle(itemId: string) {
  return `card-${itemId}`;
}

export type CatalogInput = Pick<
  CatalogItem,
  "image_url" | "title" | "subtitle" | "button_label" | "button_action" | "button_url"
>;

/**
 * Valida e normaliza o corpo vindo do painel. Devolve a mensagem de erro em
 * vez de lancar, para a rota responder 400 com texto legivel. O banco tem os
 * mesmos checks; aqui e so para a pessoa ler um motivo em portugues.
 */
export function parseCatalogInput(
  body: Record<string, unknown>,
): { ok: true; value: CatalogInput } | { ok: false; error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const image_url = str(body.image_url);
  const title = str(body.title);
  const subtitle = str(body.subtitle) || null;
  const button_label = str(body.button_label);
  const button_action = body.button_action === "flow" ? "flow" : "url";
  const button_url = button_action === "url" ? str(body.button_url) || null : null;

  if (!/^https:\/\//i.test(image_url)) {
    return { ok: false, error: "A imagem precisa de uma URL pública com https://." };
  }
  if (!title) return { ok: false, error: "Dê um título ao card." };
  if (title.length > CATALOG_LIMITS.title) {
    return { ok: false, error: `Título com no máximo ${CATALOG_LIMITS.title} caracteres.` };
  }
  if (subtitle && subtitle.length > CATALOG_LIMITS.subtitle) {
    return { ok: false, error: `Descrição com no máximo ${CATALOG_LIMITS.subtitle} caracteres.` };
  }
  if (!button_label) return { ok: false, error: "Dê um texto ao botão." };
  if (button_label.length > CATALOG_LIMITS.buttonLabel) {
    return {
      ok: false,
      error: `Texto do botão com no máximo ${CATALOG_LIMITS.buttonLabel} caracteres.`,
    };
  }
  if (button_action === "url" && !/^https?:\/\//i.test(button_url ?? "")) {
    return { ok: false, error: "O botão de link precisa de uma URL começando com http(s)://." };
  }

  return {
    ok: true,
    value: { image_url, title, subtitle, button_label, button_action, button_url },
  };
}
