import { HIGHLIGHT_PLAN, PLANS, type PlanSlug } from "@/lib/billing/plans";

/** "39,90" -> 39.9. Os preços em PLANS são texto no formato brasileiro. */
const toNumber = (price: string) => Number(price.replace(/\./g, "").replace(",", "."));

export const PLAN_LIST = (Object.keys(PLANS) as PlanSlug[]).map((slug) => {
  const plan = PLANS[slug];
  return {
    slug,
    name: plan.name,
    price: plan.price,
    blurb: plan.blurb,
    volume:
      plan.messages === null
        ? "Mensagens ilimitadas"
        : `Até ${plan.messages.toLocaleString("pt-BR")} mensagens por mês`,
    fairUse: plan.messages === null,
    highlight: slug === HIGHLIGHT_PLAN,
    href: `/cadastro?plano=${slug}`,
  };
});

/** Plano mais barato: é a "porta de entrada" usada no comparativo. */
export const ENTRY_PLAN = PLAN_LIST.reduce((a, b) => (toNumber(b.price) < toNumber(a.price) ? b : a));

/**
 * ManyChat: só o que foi conferido na página de preços deles em set/2026.
 * Ao atualizar, mude a data em MANYCHAT.checkedAt também.
 */
export const MANYCHAT = {
  entryPrice: 149,
  aiAddon: 299,
  checkedAt: "set/2026",
};

/** Quanto o plano de entrada custa a menos que o do ManyChat, em %. */
export const ENTRY_SAVINGS = Math.round((1 - toNumber(ENTRY_PLAN.price) / MANYCHAT.entryPrice) * 100);
