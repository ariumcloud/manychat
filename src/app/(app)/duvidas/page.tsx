"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Loader2, MessagesSquare, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [m, i] = await Promise.all([
        fetchJson<{ media: Media[] }>("/api/media"),
        fetchJson<{ insights: Insight[] }>("/api/insights/comments"),
      ]);
      if (cancelled) return;

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

      <div className="max-w-3xl space-y-6 p-8">
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <section className="card p-5">
          <label className="label" htmlFor="post">
            Qual post
          </label>
          <div className="flex gap-2">
            <select
              id="post"
              className="input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.comments_count ?? 0} coment.] {(m.caption ?? "sem legenda").slice(0, 60)}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={mine} disabled={mining || !selected}>
              {mining ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Minerar
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--fg-dim)]">
            Elogio, emoji e &ldquo;salvei&rdquo; são descartados — só entra o que é pergunta ou
            travamento.
          </p>
        </section>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={15} className="animate-spin" /> carregando…
          </div>
        ) : insights.length === 0 ? (
          <div className="card p-8 text-center">
            <MessagesSquare size={22} className="mx-auto text-[var(--fg-dim)]" />
            <p className="mt-3 text-sm text-[var(--fg-muted)]">
              Nada minerado ainda. Escolhe o post com mais comentários e roda.
            </p>
          </div>
        ) : (
          insights.map((insight) => (
            <section key={insight.id} className="card overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {insight.media_caption ?? "post"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                    {insight.sample_size} comentários lidos · {insight.themes.length} temas
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--fg-dim)]">
                  {timeAgo(insight.created_at)}
                </span>
              </div>

              {insight.themes.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[var(--fg-dim)]">
                  Nenhuma pergunta real nesse post — só elogio e emoji.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {insight.themes.map((t, i) => (
                    <li key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-medium">{t.tema}</h3>
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
                          <Link
                            href="/carrossel"
                            className="mt-1.5 inline-block text-[11px] text-[var(--accent)] hover:underline"
                          >
                            virar carrossel →
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </>
  );
}
