/**
 * Planos vendidos: fonte unica para a pagina de vendas, o painel e o bloqueio
 * por limite. O slug e o que fica gravado em mc_accounts.plan e vai na URL de
 * checkout; o preco cobrado vem de uma variavel de ambiente com o ID do preco
 * criado na Stripe (ver scripts/stripe-setup.mjs). `price` e `blurb` sao so
 * para exibir: mude os dois lados (aqui e na Stripe) juntos.
 *
 * `messages: null` = sem limite (uso justo). A ordem daqui e a da pagina; para
 * vender menos planos, apague o objeto.
 */
export const PLANS = {
  essencial: {
    name: "Essencial",
    price: "39,90",
    messages: 2500,
    blurb: "Para começar a automatizar o Instagram.",
    priceEnv: "STRIPE_PRICE_ESSENCIAL",
  },
  pro: {
    name: "Pro",
    price: "97",
    messages: 10_000,
    blurb: "Para quem vende com Reels e comentários todo dia.",
    priceEnv: "STRIPE_PRICE_PRO",
  },
  ilimitado: {
    name: "Ilimitado",
    price: "197",
    messages: null,
    blurb: "Para perfis grandes, sem contar mensagem.",
    priceEnv: "STRIPE_PRICE_ILIMITADO",
  },
} as const satisfies Record<
  string,
  { name: string; price: string; messages: number | null; blurb: string; priceEnv: string }
>;

/**
 * Plano gratuito: nao e vendido (fica fora de PLANS, da pagina e da Stripe).
 * E o plano de quem cria conta sem assinar; sem cartao, 500 mensagens por mes.
 */
export const FREE_PLAN = { slug: "free", name: "Grátis", messages: 500 } as const;

export function isFreePlan(value: unknown): boolean {
  return value === FREE_PLAN.slug;
}

/** Plano que a pagina de vendas destaca como "Mais escolhido". */
export const HIGHLIGHT_PLAN: PlanSlug = "pro";

export type PlanSlug = keyof typeof PLANS;

export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && Object.hasOwn(PLANS, value);
}

export function priceIdFor(plan: PlanSlug): string | null {
  return process.env[PLANS[plan].priceEnv]?.trim() || null;
}

/** ID de preco da Stripe -> plano. Assim o plano vem do que foi cobrado, nao de um parametro. */
export function planForPriceId(priceId: string | null | undefined): PlanSlug | null {
  if (!priceId) return null;
  return (Object.keys(PLANS) as PlanSlug[]).find((slug) => priceIdFor(slug) === priceId) ?? null;
}
