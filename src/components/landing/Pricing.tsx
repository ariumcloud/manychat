import type { CSSProperties } from "react";
import { ArrowRight, Check, CreditCard, Info } from "lucide-react";
import { PLAN_LIST } from "./pricing-data";
import { Section } from "./Section";

/** Igual em todos os planos: o que muda é só o volume. */
const INCLUDED = [
  "Comentário → DM por palavra-chave",
  "Resposta pública automática, com variações",
  "Portão “me segue”",
  "Variações de texto nas DMs",
  "Construtor visual de fluxos",
  "Inbox, contatos e painel com funil",
  "Painel próprio, com login e senha",
];

// Classes por extenso: o Tailwind só gera o que lê no código.
const GRID = PLAN_LIST.length <= 3 ? "lg:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4";

export function Pricing() {
  return (
    <Section
      id="planos"
      eyebrow="Planos"
      title="Todas as funções em todos os planos. Muda só o volume."
      lead="Escolha pela quantidade de DMs que a automação envia por mês. Dá para trocar de plano quando quiser."
    >
      <div className={`mx-auto mt-14 grid max-w-5xl items-stretch gap-5 ${GRID}`}>
        {PLAN_LIST.map((plan, i) => {
          const body = (
            <div className={`flex h-full flex-col p-6 sm:p-7 ${plan.highlight ? "bg-[#10121c]" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlight && (
                  <span className="chip" style={{ color: "#fff", border: 0, background: "var(--brand)" }}>
                    Mais escolhido
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{plan.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-base text-[var(--fg-muted)]">R$</span>
                <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                <span className="text-sm text-[var(--fg-muted)]">/mês</span>
              </p>
              <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-sm font-medium">
                {plan.volume}
                {plan.fairUse && <span className="font-normal text-[var(--fg-muted)]"> · uso justo</span>}
              </p>
              <ul className="mb-8 mt-6 space-y-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--lp-soft)]">
                    <Check size={15} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`btn lp-btn-lg mt-auto w-full ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
              >
                Assinar o {plan.name} <ArrowRight size={16} aria-hidden />
              </a>
            </div>
          );

          return (
            <div key={plan.slug} data-reveal style={{ "--lp-delay": `${i * 0.08}s` } as CSSProperties}>
              {plan.highlight ? (
                <div className="lp-gradient-border h-full lg:-my-3">{body}</div>
              ) : (
                <div className="card lp-lift h-full">{body}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-[var(--lp-soft)] sm:grid-cols-2">
        <p className="flex items-start gap-2.5">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--lp-eyebrow)]" aria-hidden />
          <span>
            <strong className="font-semibold text-[var(--fg)]">Mensagem = cada DM enviada pela automação.</strong>{" "}
            Respostas suas no Inbox e respostas públicas nos comentários não contam.
          </span>
        </p>
        <p className="flex items-start gap-2.5">
          <CreditCard size={16} className="mt-0.5 shrink-0 text-[var(--lp-eyebrow)]" aria-hidden />
          <span>
            <strong className="font-semibold text-[var(--fg)]">Pagamento no cartão, assinatura mensal.</strong>{" "}
            Sem fidelidade: cancele quando quiser.
          </span>
        </p>
      </div>
    </Section>
  );
}
