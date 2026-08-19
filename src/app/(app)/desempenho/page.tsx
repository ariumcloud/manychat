"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Loader2, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";
import { cn } from "@/lib/utils";

type Funnel = {
  comentarios: number;
  com_gatilho: number;
  dm_enviada: number;
  dm_lida: number;
  cliques: number;
  pessoas_que_clicaram: number;
};

type KeywordRow = {
  trigger_id: string;
  keywords: string[];
  kind: string;
  fluxo: string | null;
  comentarios: number;
  dm_enviada: number;
  links_enviados: number;
  links_clicados: number;
};

const PERIODS = [7, 30, 90];

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(0)}%`;
}

export default function DesempenhoPage() {
  const [days, setDays] = useState(30);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { ok, data, error: err } = await fetchJson<{
        funnel: Funnel;
        keywords: KeywordRow[];
      }>(`/api/analytics?days=${days}`);

      if (cancelled) return;
      if (ok) {
        setFunnel(data?.funnel ?? null);
        setKeywords(data?.keywords ?? []);
      }
      setError(ok ? null : err);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  const steps = funnel
    ? [
        { label: "Comentaram", value: funnel.comentarios, hint: "capturados pelo webhook" },
        { label: "Casaram com um gatilho", value: funnel.com_gatilho, hint: "bateu a palavra-chave" },
        { label: "Receberam a DM", value: funnel.dm_enviada, hint: "entregue pelo Instagram" },
        { label: "Abriram a DM", value: funnel.dm_lida, hint: "confirmação de leitura" },
        { label: "Clicaram no link", value: funnel.pessoas_que_clicaram, hint: "pessoas únicas" },
      ]
    : [];

  const topo = funnel?.comentarios ?? 0;

  return (
    <>
      <PageHeader
        title="Desempenho"
        subtitle="Do comentário até o clique — o número que quase ninguém mede."
        action={
          <div className="flex gap-1 rounded-lg bg-[var(--bg-elev)] p-1">
            {PERIODS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  days === d
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      <div className="max-w-4xl space-y-6 p-8">
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={15} className="animate-spin" /> carregando…
          </div>
        ) : (
          <>
            <section className="card p-6">
              <h2 className="mb-5 text-sm font-semibold">Funil</h2>

              <div className="space-y-1">
                {steps.map((s, i) => {
                  const width = topo ? Math.max((s.value / topo) * 100, 2) : 0;
                  const prev = i === 0 ? null : steps[i - 1];

                  return (
                    <div key={s.label}>
                      {i > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-1 text-[11px] text-[var(--fg-dim)]">
                          <ArrowDown size={11} />
                          {prev && pct(s.value, prev.value)} de quem chegou aqui
                        </div>
                      )}

                      <div className="relative overflow-hidden rounded-lg bg-[var(--bg-elev-2)]">
                        <div
                          className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]"
                          style={{ width: `${width}%` }}
                        />
                        <div className="relative flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{s.label}</p>
                            <p className="text-[11px] text-[var(--fg-dim)]">{s.hint}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-semibold tabular-nums">{s.value}</p>
                            {i > 0 && (
                              <p className="text-[11px] text-[var(--fg-dim)]">
                                {pct(s.value, topo)} do topo
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {funnel && funnel.cliques > funnel.pessoas_que_clicaram && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
                  <MousePointerClick size={12} />
                  {funnel.cliques} cliques no total — alguns voltaram mais de uma vez.
                </p>
              )}

              {topo === 0 && (
                <p className="mt-4 text-sm text-[var(--fg-dim)]">
                  Nada nesse período ainda. Os números aparecem depois que alguém comentar num
                  post com automação ligada.
                </p>
              )}
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-sm font-semibold">Qual palavra-chave converte</h2>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  Trazer muita gente não é o mesmo que trazer gente que clica.
                </p>
              </div>

              {keywords.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[var(--fg-dim)]">
                  Nenhuma automação com dados ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--fg-muted)]">
                        <th className="px-5 py-3 font-medium">Palavra-chave</th>
                        <th className="px-5 py-3 font-medium">Comentários</th>
                        <th className="px-5 py-3 font-medium">DMs</th>
                        <th className="px-5 py-3 font-medium">Cliques</th>
                        <th className="px-5 py-3 font-medium">Conversão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {keywords.map((k) => (
                        <tr key={k.trigger_id} className="hover:bg-[var(--bg-elev)]">
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {k.keywords.length ? (
                                k.keywords.map((w) => (
                                  <code
                                    key={w}
                                    className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono text-[11px]"
                                  >
                                    {w}
                                  </code>
                                ))
                              ) : (
                                <span className="text-[var(--fg-dim)]">—</span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--fg-dim)]">{k.fluxo}</p>
                          </td>
                          <td className="px-5 py-3 tabular-nums">{k.comentarios}</td>
                          <td className="px-5 py-3 tabular-nums">{k.dm_enviada}</td>
                          <td className="px-5 py-3 tabular-nums">{k.links_clicados}</td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                "chip",
                                k.links_enviados && k.links_clicados / k.links_enviados >= 0.3
                                  ? "chip-ok"
                                  : "",
                              )}
                            >
                              {pct(k.links_clicados, k.links_enviados)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
