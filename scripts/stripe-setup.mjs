/**
 * Cria na Stripe os 3 planos (produto + preço mensal em BRL) e, se você passar
 * --webhook, o endpoint do webhook. Pode rodar de novo à vontade: o que já
 * existe é reaproveitado (os preços são achados pela lookup_key).
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --webhook https://manychat-murex.vercel.app/api/stripe/webhook
 *
 * Use primeiro a chave de TESTE (sk_test_...). A chave fica só no seu terminal.
 * No fim ele imprime as variáveis para colar na Vercel.
 *
 * Os valores abaixo (em centavos) precisam bater com src/lib/billing/plans.ts.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Defina STRIPE_SECRET_KEY (use a chave de teste, sk_test_...).");
  process.exit(1);
}
const stripe = new Stripe(key);

const PLANS = [
  { slug: "essencial", env: "STRIPE_PRICE_ESSENCIAL", name: "Fluxo Essencial", cents: 3990 },
  { slug: "pro", env: "STRIPE_PRICE_PRO", name: "Fluxo Pro", cents: 9700 },
  { slug: "ilimitado", env: "STRIPE_PRICE_ILIMITADO", name: "Fluxo Ilimitado", cents: 19700 },
];

const lines = [];

for (const plan of PLANS) {
  const lookupKey = `fluxo_${plan.slug}_mensal`;
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });

  let price = found.data[0];
  if (price && price.unit_amount !== plan.cents) {
    console.warn(
      `! ${plan.name}: o preço existente é ${price.unit_amount / 100}, mas plans.ts pede ${plan.cents / 100}. ` +
        `Preço da Stripe não se edita: crie outro no painel e troque o ID.`,
    );
  }
  if (!price) {
    const product = await stripe.products.create({ name: plan.name, metadata: { plan: plan.slug } });
    price = await stripe.prices.create({
      product: product.id,
      currency: "brl",
      unit_amount: plan.cents,
      recurring: { interval: "month" },
      lookup_key: lookupKey,
    });
    console.log(`+ criado ${plan.name} (${price.id})`);
  } else {
    console.log(`= já existia ${plan.name} (${price.id})`);
  }
  lines.push(`${plan.env}=${price.id}`);
}

const webhookIdx = process.argv.indexOf("--webhook");
if (webhookIdx !== -1) {
  const url = process.argv[webhookIdx + 1];
  if (!url) {
    console.error("Passe a URL depois de --webhook.");
    process.exit(1);
  }
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === url);
  if (existing) {
    console.log(`= webhook já existia (${existing.id}). O segredo só aparece na criação: copie do painel da Stripe.`);
  } else {
    const endpoint = await stripe.webhookEndpoints.create({
      url,
      enabled_events: [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ],
    });
    console.log(`+ webhook criado (${endpoint.id})`);
    lines.push(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
  }
}

console.log("\nCole na Vercel (Settings > Environment Variables):\n");
console.log(lines.join("\n"));
console.log("STRIPE_SECRET_KEY=<a mesma chave que você usou aqui>");
