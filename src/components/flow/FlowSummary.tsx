"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FlowNode, NodeKind } from "@/lib/flow/types";
import type { Issue } from "./validate";
import { KIND_META } from "./meta";

/**
 * O que o inspetor mostra quando nenhum bloco esta selecionado: em vez de um
 * "clique num bloco", um resumo do fluxo e a lista do que ainda precisa de
 * atencao — clicar num aviso seleciona o bloco.
 */
export function FlowSummary({
  nodes,
  issues,
  status,
  onSelect,
}: {
  nodes: FlowNode[];
  issues: Issue[];
  status: "draft" | "live" | "paused";
  onSelect: (id: string) => void;
}) {
  const counts = new Map<NodeKind, number>();
  for (const n of nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
  const messages = nodes.filter((n) => n.type === "text" || n.type === "buttons" || n.type === "carousel" || n.type === "image").length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-sm font-semibold">Resumo do fluxo</h2>
        <p className="mt-0.5 text-xs text-[var(--fg-dim)]">Clique num bloco para editar o conteúdo dele.</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/40 px-3 py-2.5">
            <p className="text-[11px] text-[var(--fg-dim)]">Blocos</p>
            <p className="text-lg font-semibold tabular-nums">{nodes.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/40 px-3 py-2.5">
            <p className="text-[11px] text-[var(--fg-dim)]">Mensagens</p>
            <p className="text-lg font-semibold tabular-nums">{messages}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[...counts.entries()].map(([kind, n]) => {
            const { label, icon: Icon, color } = KIND_META[kind];
            return (
              <span key={kind} className="chip" style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, var(--border))` }}>
                <Icon size={11} /> {label} {n > 1 ? `×${n}` : ""}
              </span>
            );
          })}
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            {issues.length === 0 ? (
              <>
                <CheckCircle2 size={14} className="text-[var(--success)]" /> Tudo certo
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-[var(--warn)]" /> {issues.length}{" "}
                {issues.length === 1 ? "ponto de atenção" : "pontos de atenção"}
              </>
            )}
          </h3>

          {issues.length === 0 ? (
            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
              {status === "live"
                ? "O fluxo está no ar. Se editar, lembre de salvar."
                : "Nenhum problema encontrado. Quando estiver pronto, é só publicar."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((issue, i) => {
                const node = nodes.find((n) => n.id === issue.nodeId);
                const meta = node ? KIND_META[node.type] : null;
                return (
                  <li key={i}>
                    <button
                      onClick={() => onSelect(issue.nodeId)}
                      className="flex w-full items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elev-2)]/40 px-2.5 py-2 text-left text-xs transition-colors hover:border-[var(--border-strong)]"
                    >
                      {meta && <meta.icon size={13} className="mt-0.5 shrink-0" style={{ color: meta.color }} />}
                      <span className="leading-snug text-[var(--fg-muted)]">{issue.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
