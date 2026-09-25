import Stripe from "stripe";

let client: Stripe | null = null;

/** Cliente da Stripe. Falha com mensagem clara se a chave nao foi configurada. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Defina STRIPE_SECRET_KEY nas variáveis de ambiente.");
    client = new Stripe(key);
  }
  return client;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
