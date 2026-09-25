"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Kpi, Page } from "@/components/ui";
import { fetchJson } from "@/lib/fetchJson";
import { cn } from "@/lib/utils";

type Reel = {
  id: string;
  caption: string;
  isReel: boolean;
  thumbnail: string | null;
  permalink: string | null;
  timestamp: string | null;
  metrics: Record<string, number>;
  engagementRate: number | null;
  metricsError: string | null;
};

type SortKey = "recentes" | "views" | "engajamento";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "recentes", label: "Mais recentes" },
  { key: "views", label: "Mais vistos" },
  { key: "engajamento", label: "Maior engajamento" },
];

function compact(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}k`;
  return String(n);
}

/** A API devolve tempo de visualização em milissegundos. */
function duration(ms: number | undefined): string {
  if (!ms) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const min = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  if (min < 60) return `${min}m ${rest}s`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon size={13} className="shrink-0 text-[var(--fg-dim)]" />
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recentes");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { ok, data, error: err } = await fetchJson<{ reels: Reel[] }>("/api/reels");
      if (cancelled) return;
      if (ok) setReels(data?.reels ?? []);
      setError(ok ? null : err);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...reels];
    if (sort === "views") {
      copy.sort((a, b) => (b.metrics.views ?? b.metrics.reach ?? 0) - (a.metrics.views ?? a.metrics.reach ?? 0));
    } else if (sort === "engajamento") {
      copy.sort((a, b) => (b.engagementRate ?? -1) - (a.engagementRate ?? -1));
    } else {
      copy.sort(
        (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
      );
    }
    return copy;
  }, [reels, sort]);

  const totals = useMemo(() => {
    const views = reels.reduce((sum, r) => sum + (r.metrics.views ?? 0), 0);
    const reach = reels.reduce((sum, r) => sum + (r.metrics.reach ?? 0), 0);
    const interactions = reels.reduce((sum, r) => sum + (r.metrics.total_interactions ?? 0), 0);
    return { views, reach, interactions };
  }, [reels]);

  const open = sorted.find((r) => r.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Seus Reels"
        subtitle="Escolha um post pra criar automação — e veja como cada um performou."
      />

      <Page>
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={15} className="animate-spin" /> buscando seus posts e métricas…
          </div>
        ) : reels.length === 0 ? (
          <p className="text-sm text-[var(--fg-dim)]">
            Nenhum post encontrado nessa conta.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={Film} label="Posts analisados" value={reels.length} hint="mais recentes da conta" tone="linear-gradient(135deg,#7c5cff,#5b6bff)" />
              <Kpi icon={Eye} label="Views" value={compact(totals.views)} hint="soma dos posts" tone="linear-gradient(135deg,#a44dff,#7c5cff)" />
              <Kpi icon={Users} label="Contas alcançadas" value={compact(totals.reach)} hint="soma dos posts" tone="linear-gradient(135deg,#f9578e,#a44dff)" />
              <Kpi icon={Zap} label="Interações" value={compact(totals.interactions)} hint="curtidas, comentários, salvos e envios" tone="linear-gradient(135deg,#34d399,#0ea5e9)" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--fg-dim)]">Clique em um post para ver as métricas e criar a automação.</p>
              <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] p-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      sort === s.key ? "bg-[var(--accent)] text-white" : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {sorted.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setOpenId(r.id)}
                  className="card group overflow-hidden text-left transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="relative aspect-[9/16] overflow-hidden bg-[var(--bg-elev-2)]">
                    {r.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnail}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[var(--fg-dim)]">
                        sem prévia
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                      <div className="flex items-center gap-3 text-xs font-medium text-white">
                        <Stat icon={Eye} value={compact(r.metrics.views)} label="views" />
                        <Stat icon={Heart} value={compact(r.metrics.likes)} label="curtidas" />
                        <Stat
                          icon={MessageCircle}
                          value={compact(r.metrics.comments)}
                          label="comentários"
                        />
                      </div>
                    </div>

                    {r.engagementRate !== null && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums backdrop-blur">
                        {r.engagementRate.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-[var(--fg-muted)]">
                      {r.caption || "sem legenda"}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--fg-dim)]">
                      {r.timestamp
                        ? new Date(r.timestamp).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Page>

      {open && <ReelDetail reel={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ReelDetail({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const m = reel.metrics;

  const rows: Array<{ icon: typeof Eye; label: string; value: string; hint?: string }> = [
    { icon: Eye, label: "Views", value: compact(m.views), hint: "reproduções do vídeo" },
    {
      icon: Users,
      label: "Contas alcançadas",
      value: compact(m.reach),
      hint: "pessoas únicas que viram",
    },
    { icon: Heart, label: "Curtidas", value: compact(m.likes) },
    { icon: MessageCircle, label: "Comentários", value: compact(m.comments) },
    { icon: Send, label: "Compartilhamentos", value: compact(m.shares) },
    { icon: Bookmark, label: "Salvamentos", value: compact(m.saved) },
    {
      icon: Zap,
      label: "Interações totais",
      value: compact(m.total_interactions),
      hint: "curtidas + comentários + compartilhamentos + salvamentos",
    },
    {
      icon: Clock,
      label: "Tempo médio assistido",
      value: duration(m.ig_reels_avg_watch_time),
      hint: "quanto cada pessoa assistiu, em média",
    },
    {
      icon: Clock,
      label: "Tempo total assistido",
      value: duration(m.ig_reels_video_view_total_time),
      hint: "somando todo mundo",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-[var(--bg-elev)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-6 py-5">
          {reel.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reel.thumbnail}
              alt=""
              className="h-20 w-14 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-sm leading-relaxed">{reel.caption || "sem legenda"}</p>
            {reel.permalink && (
              <a
                href={reel.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
              >
                abrir no Instagram <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {reel.engagementRate !== null && (
            <div className="card mb-5 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums">
                {reel.engagementRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                taxa de engajamento (interações ÷ alcance)
              </p>
            </div>
          )}

          {reel.metricsError && (
            <p className="mb-4 text-xs text-[var(--warn)]">
              Métricas indisponíveis: {reel.metricsError}
            </p>
          )}

          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4">
                <dt className="flex items-start gap-2 text-sm text-[var(--fg-muted)]">
                  <r.icon size={14} className="mt-0.5 shrink-0 text-[var(--fg-dim)]" />
                  <span>
                    {r.label}
                    {r.hint && (
                      <span className="block text-[11px] text-[var(--fg-dim)]">{r.hint}</span>
                    )}
                  </span>
                </dt>
                <dd className="shrink-0 text-sm font-medium tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <Link href={`/automacoes?media=${reel.id}`} className="btn btn-primary w-full">
            <Sparkles size={15} /> Criar automação neste post
          </Link>
          <p className="mt-2 text-center text-[11px] text-[var(--fg-dim)]">
            Quem comentar aqui recebe DM automática.
          </p>
        </div>
      </div>
    </div>
  );
}
