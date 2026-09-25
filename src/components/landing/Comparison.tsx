import { BadgePercent } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ENTRY_PLAN, ENTRY_SAVINGS, MANYCHAT } from "./pricing-data";
import { Section } from "./Section";

const brl = (n: number) => n.toLocaleString("pt-BR");

const ROWS = [
  {
    label: "Preço de entrada",
    us: `R$ ${ENTRY_PLAN.price}/mês (plano ${ENTRY_PLAN.name})`,
    them: `Pro “a partir de” R$ ${brl(MANYCHAT.entryPrice)}/mês`,
  },
  {
    label: "Como cobra",
    us: "Por mensagens enviadas",
    them: "Por número de contatos: o preço sobe conforme a lista cresce",
  },
  {
    label: "Foco",
    us: "Só Instagram: comentário vira DM",
    them: "Vários canais: Instagram, Messenger, WhatsApp, e-mail e SMS",
  },
  {
    label: "Inteligência artificial",
    us: "Não inclui",
    them: `Pacote de IA vendido à parte, por +R$ ${brl(MANYCHAT.aiAddon)}/mês`,
  },
];

export function Comparison() {
  return (
    <Section
      id="comparativo"
      eyebrow="Comparativo"
      title={`${BRAND.name} ou ManyChat?`}
      lead={`O ManyChat é uma ferramenta completa, com mais canais e mais recursos. O ${BRAND.name} faz uma coisa só, comentário vira DM no Instagram, e cobra menos por isso.`}
    >
      <div data-reveal className="mx-auto mt-12 max-w-4xl">
        <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.08)] px-4 py-2 text-sm font-medium text-[var(--success)]">
          <BadgePercent size={16} aria-hidden />≈{ENTRY_SAVINGS}% mais barato na porta de entrada
        </p>

        {/* Tabela (tablet e desktop) */}
        <div className="lp-glass mt-8 hidden overflow-hidden md:block">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">
              Comparação entre {BRAND.name} e ManyChat: preço de entrada, forma de cobrança, foco e IA
            </caption>
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th scope="col" className="w-[26%] px-6 py-4 text-sm font-medium text-[var(--fg-muted)]">
                  <span className="sr-only">Critério</span>
                </th>
                <th scope="col" className="bg-[rgba(124,92,255,0.08)] px-6 py-4 text-base font-semibold">
                  <span className="lp-gradient-text">{BRAND.name}</span>
                </th>
                <th scope="col" className="px-6 py-4 text-base font-semibold text-[var(--lp-soft)]">
                  ManyChat
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-white/[0.05] last:border-0">
                  <th scope="row" className="px-6 py-5 align-top text-sm font-medium text-[var(--fg-muted)]">
                    {r.label}
                  </th>
                  <td className="bg-[rgba(124,92,255,0.08)] px-6 py-5 align-top font-medium">{r.us}</td>
                  <td className="px-6 py-5 align-top text-[var(--lp-soft)]">{r.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cartões (celular) */}
        <ul className="mt-8 space-y-3 md:hidden">
          {ROWS.map((r) => (
            <li key={r.label} className="lp-glass p-4">
              <h3 className="text-sm font-medium text-[var(--fg-muted)]">{r.label}</h3>
              <dl className="mt-3 grid gap-3">
                <div className="rounded-xl bg-[rgba(124,92,255,0.1)] p-3">
                  <dt className="text-xs font-semibold text-[var(--lp-eyebrow)]">{BRAND.name}</dt>
                  <dd className="mt-1 text-[15px] font-medium">{r.us}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <dt className="text-xs font-semibold text-[var(--fg-muted)]">ManyChat</dt>
                  <dd className="mt-1 text-[15px] text-[var(--lp-soft)]">{r.them}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 max-w-2xl text-pretty text-center leading-relaxed text-[var(--lp-soft)]">
          Precisa de WhatsApp, e-mail ou SMS? O ManyChat atende melhor. Se o seu jogo é o
          Instagram, o {BRAND.name} resolve com menos.
        </p>
        <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
          Preços do ManyChat consultados em {MANYCHAT.checkedAt} e sujeitos a mudança. {BRAND.name}{" "}
          não é afiliado ao ManyChat.
        </p>
      </div>
    </Section>
  );
}
