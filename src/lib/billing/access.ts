import { PLANS, isPlanSlug } from "./plans";

/** Estados da assinatura em que a automacao roda. `past_due` tem carencia: a Stripe ainda tenta cobrar. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type Billing = {
  plan: string | null;
  subscription_status: string | null;
};

export type Access = { allowed: true } | { allowed: false; reason: string };

/**
 * Regra unica de "esta conta pode rodar automacao agora?". Pura, para poder ser
 * testada sem banco.
 *
 *  - sem plano = nunca assinou = fora da cobranca (conta do dono, contas antigas);
 *  - assinatura cancelada/nao paga = pausada;
 *  - passou do limite do plano no mes = pausada ate virar o mes ou trocar de plano.
 */
export function decideAccess(billing: Billing, usedThisMonth: number): Access {
  if (!billing.plan) return { allowed: true };

  if (!ACTIVE_STATUSES.has(billing.subscription_status ?? "")) {
    return { allowed: false, reason: "Assinatura inativa: as automações estão pausadas." };
  }

  const limit = isPlanSlug(billing.plan) ? PLANS[billing.plan].messages : null;
  if (limit !== null && usedThisMonth >= limit) {
    return {
      allowed: false,
      reason: `Limite de ${limit.toLocaleString("pt-BR")} mensagens do plano atingido neste mês.`,
    };
  }
  return { allowed: true };
}

/** "YYYY-MM" no horario de Brasilia (UTC-3), que e o mes que o cliente enxerga. */
export function currentPeriod(now = Date.now()): string {
  return new Date(now - 3 * 3600_000).toISOString().slice(0, 7);
}
