"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Loader2, MessagesSquare, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Page, Panel } from "@/components/ui";
import { fetchJson } from "@/lib/fetchJson";
import { timeAgo } from "@/lib/utils";

type Theme = {
  tema: string;
  quantas: number;
  exemplos: string[];
  sugestao_de_post: string;
};

type Insight = {
  id: string;
  media_id: string | null;
  media_caption: string | null;
  sample_size: number;
  themes: Theme[];
  created_at: string;
};

type Media = { id: string; caption?: string; comments_count?: number };

export default function DuvidasPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Carrosseis sao recurso do dono: o link so aparece para ele.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [m, i, me] = await Promise.all([
        fetchJson<{ media: Media[] }>("/api/media"),
        fetchJson<{ insights: Insight[] }>("/api/insights/comments"),
        fetchJson<{ role: string | null }>("/api/me"),
      ]);
      if (cancelled) return;
      setIsAdmin(me.data?.role === "admin");

      const list = m.data?.media ?? [];
      setMedia(list);
      setInsights(i.data?.insights ?? []);
      // Começa no post com mais comentários — é onde tem material.
      if (list.length && !selected) {
        const best = [...list].sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0))[0];
        setSelected(best.id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function mine() {
    setMining(true);
    setError(null);

    const chosen = media.find((m) => m.id === selected);
    const { ok, error: err } = await fetchJson("/api/insights/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: selected, media_caption: chosen?.caption ?? null }),
    });

    if (ok) setVersion((v) => v + 1);
    else setError(err ?? "Não consegui minerar.");
    setMining(false);
  }

  return (
    <>
      <PageHeader
        title="Dúvidas dos comentários"
        subtitle="Leio os comentários de um post e agrupo o que as pessoas realmente perguntam."
      />

      <Page>
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">{error}</div>
        )}

        <div className="grid items-start gap-4 xl:grid-cols-[340px_1fr]">
          <Panel title="Minerar um post" subtitle="agrupo o que as pessoas perguntam" className="xl:sticky xl:top-20">
            <label className="label" htmlFor="post">
              Qual post
            </label>
            <select id="post" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.comments_count ?? 0} coment.] {(m.caption ?? "sem legenda").slice(0, 60)}
                </option>
              ))}
            </select>
            <button className="btn btn-primary mt-3 w-full" onClick={mine} disabled={mining || !selected}>
              {mining ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Minerar comentários
            </button>
            <p className="mt-3 rounded-lg bg-[var(--bg-elev-2)]/60 px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">
              Elogio, emoji e &ldquo;salvei&rdquo; são descartados — só entra o que é pergunta ou travamento.
            </p>
            {insights.length > 0 && (
              <p className="mt-3 text-xs text-[var(--fg-muted)]">
                {insights.length} {insights.length === 1 ? "post minerado" : "posts minerados"}
              </p>
            )}
          </Panel>

          <div className="min-w-0 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                <Loader2 size={15} className="animate-spin" /> carregando…
              </div>
            ) : insights.length === 0 ? (
              <div className="card p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <MessagesSquare size={20} />
                </span>
                <h2 className="mt-4 text-sm font-semibold">Nada minerado ainda</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[var(--fg-muted)]">
                  Escolha o post com mais comentários e rode. Você recebe os temas mais perguntados e uma
                  sugestão de post para cada um.
                </p>
              </div>
            ) : (
              insights.map((insight) => (
                <Panel
                  key={insight.id}
                  title={insight.media_caption ?? "post"}
                  subtitle={`${insight.sample_size} comentários lidos · ${insight.themes.length} temas · ${timeAgo(insight.created_at)}`}
                  flush
                >
                  {insight.themes.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--fg-dim)]">
                      Nenhuma pergunta real nesse post — só elogio e emoji.
                    </p>
                  ) : (
                    <ul className="grid divide-y divide-[var(--border)] 2xl:grid-cols-2 2xl:divide-y-0">
                      {insight.themes.map((t, i) => (
                        <li key={i} className="border-[var(--border)] px-4 py-3.5 2xl:border-t 2xl:odd:border-r">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-[13px] font-semibold">{t.tema}</h3>
                            <span className="chip shrink-0">{t.quantas}×</span>
                          </div>

                          {t.exemplos.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {t.exemplos.map((e, j) => (
                                <li
                                  key={j}
                                  className="border-l-2 border-[var(--border-strong)] pl-3 text-xs italic text-[var(--fg-muted)]"
                                >
                                  &ldquo;{e}&rdquo;
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--accent-soft)] p-3">
                            <Lightbulb size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-relaxed">{t.sugestao_de_post}</p>
                              {isAdmin && (
                                <Link
                                  href="/dashboard/carrossel"
                                  className="mt-1.5 inline-block text-[11px] text-[var(--accent)] hover:underline"
                                >
                                  virar carrossel →
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              ))
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
