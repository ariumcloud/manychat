"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
      router.push(`/fluxos/${data.flow.id}`);
    } else {
      setError(err ?? "Não consegui criar o fluxo.");
      setCreating(false);
    }
  }

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

      <div className="p-8">
        {error && (
          <div className="card mb-5 border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {flows.map((f) => (
              <Link key={f.id} href={`/fluxos/${f.id}`} className="card p-5 transition-colors hover:border-[var(--border-strong)]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium">{f.name}</h3>
                  <span className={STATUS[f.status]?.className ?? "chip"}>
                    {STATUS[f.status]?.label ?? f.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--fg-muted)]">
                  {f.description || `${f.nodes?.length ?? 0} blocos`}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--fg-dim)]">
                  <span>{f.sent_count} disparos</span>
                  <span>{timeAgo(f.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
