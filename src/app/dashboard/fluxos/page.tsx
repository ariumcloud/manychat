"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Search, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Page } from "@/components/ui";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { fetchJson } from "@/lib/fetchJson";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "live" | "paused";
  sent_count: number;
  nodes: unknown[];
  updated_at: string;
};

const STATUS = {
  live: { label: "no ar", className: "chip chip-ok" },
  draft: { label: "rascunho", className: "chip" },
  paused: { label: "pausado", className: "chip chip-warn" },
} as const;

export default function FluxosPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Flow["status"]>("all");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { ok, data, error: err } = await fetchJson<{ flows: Flow[] }>("/api/flows");
      if (cancelled) return;
      if (ok) setFlows(data?.flows ?? []);
      setError(ok ? null : err);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    setCreating(true);
    setError(null);

    const { ok, data, error: err } = await fetchJson<{ flow: { id: string } }>("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Fluxo sem nome" }),
    });

    if (ok && data?.flow?.id) {
      router.push(`/dashboard/fluxos/${data.flow.id}`);
    } else {
      setError(err ?? "Não consegui criar o fluxo.");
      setCreating(false);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = flows.filter(
    (f) => (status === "all" || f.status === status) && (!q || f.name.toLowerCase().includes(q)),
  );
  const count = (st: Flow["status"]) => flows.filter((f) => f.status === st).length;

  return (
    <>
      <PageHeader
        title="Fluxos"
        subtitle="A sequência de mensagens que sai depois que um gatilho dispara."
        action={
          <button className="btn btn-primary" onClick={create} disabled={creating}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Novo fluxo
          </button>
        }
      />

      <Page>
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={15} className="animate-spin" /> carregando…
          </div>
        ) : flows.length === 0 ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Workflow size={19} />
            </div>
            <h2 className="mt-4 text-sm font-semibold">Nenhum fluxo ainda</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              Criar uma automação já monta um fluxo pra você. Ou comece do zero aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-dim)]" />
                <input
                  className="input !py-2 !pl-9 text-[13px]"
                  placeholder="Buscar fluxo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {(
                [
                  ["all", `Todos (${flows.length})`],
                  ["live", `No ar (${count("live")})`],
                  ["draft", `Rascunho (${count("draft")})`],
                  ["paused", `Pausados (${count("paused")})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    status === value
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]"
                      : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--fg-dim)]">Nenhum fluxo com esse filtro.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visible.map((f) => (
                  <FlowCard key={f.id} flow={f} />
                ))}
              </div>
            )}
          </>
        )}
      </Page>
    </>
  );
}

/** Mini diagrama da sequencia: uma bolinha por bloco (ate 6), ligadas por uma linha. */
function MiniFlow({ blocks }: { blocks: number }) {
  const shown = Math.min(Math.max(blocks, 1), 6);
  return (
    <div className="flex items-center gap-0" aria-hidden>
      {Array.from({ length: shown }, (_, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && <span className="h-px w-3 bg-[var(--border-strong)]" />}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: i === 0 ? "var(--accent-3)" : "var(--accent)", opacity: 1 - i * 0.1 }}
          />
        </div>
      ))}
      {blocks > shown && <span className="ml-2 text-[10px] text-[var(--fg-dim)]">+{blocks - shown}</span>}
    </div>
  );
}

function FlowCard({ flow: f }: { flow: Flow }) {
  const blocks = f.nodes?.length ?? 0;
  return (
    <Link href={`/dashboard/fluxos/${f.id}`} className="card card-hover flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#7c5cff,#5b6bff)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
        >
          <Workflow size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{f.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-[var(--fg-dim)]">
            {f.description || `${blocks} ${blocks === 1 ? "bloco" : "blocos"}`}
          </p>
        </div>
        <span className={STATUS[f.status]?.className ?? "chip"}>{STATUS[f.status]?.label ?? f.status}</span>
      </div>

      <MiniFlow blocks={blocks} />

      <div className="mt-auto flex items-end justify-between border-t border-[var(--border)] pt-3">
        <div>
          <p className="text-lg font-semibold leading-none tabular-nums">{(f.sent_count ?? 0).toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-[11px] text-[var(--fg-dim)]">disparos</p>
        </div>
        <span className="text-[11px] text-[var(--fg-dim)]">editado {timeAgo(f.updated_at)}</span>
      </div>
    </Link>
  );
}
