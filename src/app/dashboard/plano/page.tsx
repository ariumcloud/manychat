"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Bar, Page, Panel } from "@/components/ui";
import { fetchJson } from "@/lib/fetchJson";
import { cn } from "@/lib/utils";

type PlanCard = {
  slug: string;
  name: string;
  price: string;
  messages: number | null;
  blurb: string;
  purchasable?: boolean;
};

type AccountInfo = {
  role: "admin" | "client" | null;
  billing: {
    ready: boolean;
    plan: string | null;
    free: boolean;
    planName: string | null;
    status: string | null;
    periodEnd: string | null;
    used: number;
    limit: number | null;
    plans: PlanCard[];
  };
};

/** Mensagem para o ?assinatura=… que o checkout da Stripe devolve. */
const BILLING_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Pagamento recebido! Seu plano atualiza aqui em instantes." },
  cancelada: { ok: false, text: "O pagamento foi cancelado. Você pode escolher um plano quando quiser." },
  "ja-ativa": { ok: false, text: "Você já tem uma assinatura. Para trocar de plano, use Gerenciar assinatura." },
  "plano-invalido": { ok: false, text: "Esse plano não existe." },
  indisponivel: { ok: false, text: "As assinaturas ainda não estão disponíveis. Tente mais tarde." },
  erro: { ok: false, text: "Não consegui abrir o pagamento. Tente de novo." },
};

const STATUS_LABELS: Record<string, { label: string; ok: boolean }> = {
  active: { label: "ativa", ok: true },
  trialing: { label: "em teste", ok: true },
  past_due: { label: "pagamento pendente", ok: false },
  canceled: { label: "cancelada", ok: false },
  unpaid: { label: "não paga", ok: false },
  incomplete: { label: "aguardando pagamento", ok: false },
  incomplete_expired: { label: "expirada", ok: false },
};

/** Dias até o mês virar em Brasília (UTC-3): é quando o contador de mensagens zera. */
function daysToReset(): number {
  const br = new Date(Date.now() - 3 * 3600_000);
  const next = Date.UTC(br.getUTCFullYear(), br.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((next - br.getTime()) / 86_400_000));
}

function PlanoContent() {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = useSearchParams().get("assinatura");
  const result = status ? (BILLING_MESSAGES[status] ?? BILLING_MESSAGES.erro) : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await fetchJson<AccountInfo>("/api/account");
      if (!alive) return;
      if (data) setInfo(data);
      else setLoadError(err ?? "Não consegui carregar seu plano.");
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function openPortal() {
    setOpening(true);
    setError(null);
    const { ok, data, error: err } = await fetchJson<{ url: string }>("/api/stripe/portal", { method: "POST" });
    if (ok && data) {
      window.location.assign(data.url);
      return;
    }
    setError(err ?? "Não consegui abrir o portal.");
    setOpening(false);
  }

  const b = info?.billing;
  const paid = Boolean(b?.plan && !b.free);
  const unmetered = b !== undefined && !b.plan; // conta sem plano: dono / acesso liberado
  const statusChip = b?.free
    ? { label: "sem assinatura", ok: true }
    : (STATUS_LABELS[b?.status ?? ""] ?? { label: b?.status ?? "—", ok: false });
  const pct = b?.limit ? Math.min(100, Math.round((b.used / b.limit) * 100)) : 0;

  return (
    <>
      <PageHeader title="Plano" subtitle="Seu plano, o uso do mês e como mudar ou cancelar" />
      <Page className="max-w-4xl">
        {result && (
          <div className={cn("card p-4 text-sm", result.ok ? "text-[var(--success)]" : "text-[var(--danger)]")}>
            {result.text}
          </div>
        )}
        {loadError && <div className="card p-4 text-sm text-[var(--danger)]">{loadError}</div>}
        {!info && !loadError && (
          <div className="grid place-items-center py-16 text-[var(--fg-dim)]">
            <Loader2 className="animate-spin" size={18} />
          </div>
        )}

        {b && (
          <>
            <Panel
              title={
                <span className="flex items-center gap-2">
                  {unmetered ? "Acesso liberado" : `Plano ${b.planName}`}
                  {!unmetered && (
                    <span className={cn("chip", statusChip.ok ? "chip-ok" : "chip-danger")}>{statusChip.label}</span>
                  )}
                </span>
              }
              subtitle={
                paid && b.periodEnd
                  ? `Próxima cobrança em ${new Date(b.periodEnd).toLocaleDateString("pt-BR")}`
                  : unmetered
                    ? "Sua conta não tem limite de mensagens."
                    : undefined
              }
              action={
                paid ? (
                  <button className="btn btn-ghost" onClick={openPortal} disabled={opening}>
                    {opening ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    Gerenciar assinatura
                  </button>
                ) : undefined
              }
            >
              {!unmetered && (
                <div className="pt-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-[var(--fg-muted)]">Mensagens enviadas pelas automações neste mês</span>
                    <span>
                      <strong className="text-lg">{b.used.toLocaleString("pt-BR")}</strong>
                      <span className="text-[var(--fg-muted)]">
                        {b.limit ? ` de ${b.limit.toLocaleString("pt-BR")}` : " · sem limite"}
                      </span>
                    </span>
                  </div>
                  {b.limit && (
                    <div className="mt-2">
                      <Bar pct={pct} color={pct >= 90 ? "var(--danger)" : undefined} />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-[var(--fg-dim)]">
                    O contador zera em {daysToReset()} {daysToReset() === 1 ? "dia" : "dias"} (todo dia 1º).
                    {b.limit && pct >= 80 && b.used < b.limit && " Você está perto do limite."}
                    {b.limit && b.used >= b.limit && " Limite atingido: as automações estão pausadas."}
                  </p>
                </div>
              )}
              {paid && (
                <p className="mt-4 text-xs text-[var(--fg-dim)]">
                  No portal você troca de plano, atualiza o cartão, baixa faturas e cancela. Ao cancelar, o acesso
                  segue até o fim do período já pago.
                </p>
              )}
              {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
            </Panel>

            {!unmetered && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {b.plans.map((p) => {
                  const current = p.slug === b.plan;
                  return (
                    <div
                      key={p.slug}
                      className={cn(
                        "card flex flex-col p-4",
                        current && "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{p.name}</h3>
                        {current && <span className="chip chip-ok">seu plano</span>}
                      </div>
                      <p className="mt-2">
                        <span className="text-2xl font-semibold">{p.price === "0" ? "Grátis" : `R$ ${p.price}`}</span>
                        {p.price !== "0" && <span className="text-xs text-[var(--fg-dim)]"> /mês</span>}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-sm">
                        <Check size={14} className="text-[var(--success)]" />
                        {p.messages ? `${p.messages.toLocaleString("pt-BR")} mensagens/mês` : "Mensagens sem limite"}
                      </p>
                      <p className="mt-1 flex-1 text-xs text-[var(--fg-muted)]">{p.blurb}</p>
                      <div className="mt-4">
                        {current ? (
                          <span className="block text-center text-xs text-[var(--fg-dim)]">Plano atual</span>
                        ) : p.slug === "free" ? null : paid ? (
                          <button className="btn btn-ghost w-full" onClick={openPortal} disabled={opening}>
                            Trocar no portal
                          </button>
                        ) : b.ready && p.purchasable ? (
                          <a href={`/api/stripe/checkout?plan=${p.slug}`} className="btn btn-primary w-full">
                            Assinar {p.name}
                          </a>
                        ) : (
                          <span className="block text-center text-xs text-[var(--fg-dim)]">Indisponível</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Panel title="Dúvidas comuns">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium">O que conta como mensagem?</dt>
                  <dd className="text-[var(--fg-muted)]">
                    Cada mensagem que uma automação envia no Direct. Respostas manuais que você digita no Inbox não
                    entram na conta.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">O que acontece quando o limite acaba?</dt>
                  <dd className="text-[var(--fg-muted)]">
                    As automações pausam até o mês virar ou até você trocar de plano. Nada é apagado.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Como cancelo?</dt>
                  <dd className="text-[var(--fg-muted)]">
                    Em Gerenciar assinatura, a qualquer momento. O acesso continua até o fim do período pago.
                  </dd>
                </div>
              </dl>
            </Panel>
          </>
        )}
      </Page>
    </>
  );
}

export default function PlanoPage() {
  return (
    <Suspense>
      <PlanoContent />
    </Suspense>
  );
}
