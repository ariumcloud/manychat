"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FlowButton, FlowNode, FlowNodeData } from "@/lib/flow/types";

type Props = {
  node: FlowNode | null;
  onChange: (data: Partial<FlowNodeData>) => void;
  onDelete: () => void;
};

export function Inspector({ node, onChange, onDelete }: Props) {
  if (!node) {
    return (
      <aside className="w-72 shrink-0 border-l border-[var(--border)] bg-[var(--bg-elev)] p-5">
        <p className="text-sm text-[var(--fg-dim)]">
          Clique num bloco pra editar o conteúdo dele.
        </p>
      </aside>
    );
  }

  const d = node.data;
  const buttons = d.buttons ?? [];
  const options = d.options ?? [];

  function setButton(i: number, patch: Partial<FlowButton>) {
    const next = buttons.map((b, idx) => (idx === i ? ({ ...b, ...patch } as FlowButton) : b));
    onChange({ buttons: next });
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-sm font-semibold capitalize">{node.type}</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {(node.type === "text" ||
          node.type === "buttons" ||
          node.type === "quickReplies" ||
          node.type === "image") && (
          <div>
            <label className="label" htmlFor="i-text">
              {node.type === "image" ? "Legenda" : "Mensagem"}
            </label>
            <textarea
              id="i-text"
              rows={5}
              className="input resize-none"
              value={d.text ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
        )}

        {node.type === "image" && (
          <div>
            <label className="label" htmlFor="i-url">
              URL da imagem
            </label>
            <input
              id="i-url"
              className="input"
              placeholder="https://…"
              value={d.url ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          </div>
        )}

        {node.type === "buttons" && (
          <div>
            <span className="label">Botões (máx. 3)</span>
            <div className="space-y-3">
              {buttons.map((b, i) => (
                <div key={i} className="card space-y-2 p-3">
                  <input
                    className="input"
                    placeholder="Texto do botão"
                    value={b.label}
                    onChange={(e) => setButton(i, { label: e.target.value })}
                  />
                  {b.kind === "url" ? (
                    <input
                      className="input"
                      placeholder="https://…"
                      value={b.url}
                      onChange={(e) => setButton(i, { url: e.target.value } as Partial<FlowButton>)}
                    />
                  ) : (
                    <input
                      className="input"
                      placeholder="payload"
                      value={b.payload}
                      onChange={(e) =>
                        setButton(i, { payload: e.target.value } as Partial<FlowButton>)
                      }
                    />
                  )}
                  <button
                    className="btn btn-danger w-full"
                    onClick={() => onChange({ buttons: buttons.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              ))}
              {buttons.length < 3 && (
                <button
                  className="btn btn-ghost w-full"
                  onClick={() =>
                    onChange({ buttons: [...buttons, { kind: "url", label: "Ver mais", url: "" }] })
                  }
                >
                  <Plus size={14} /> Adicionar botão
                </button>
              )}
            </div>
          </div>
        )}

        {node.type === "quickReplies" && (
          <div>
            <span className="label">Opções</span>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input"
                    value={o.label}
                    placeholder="Opção"
                    onChange={(e) =>
                      onChange({
                        options: options.map((x, idx) =>
                          idx === i ? { ...x, label: e.target.value, payload: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    className="btn btn-danger px-2"
                    onClick={() => onChange({ options: options.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-ghost w-full"
                onClick={() => onChange({ options: [...options, { label: "", payload: "" }] })}
              >
                <Plus size={14} /> Adicionar opção
              </button>
            </div>
          </div>
        )}

        {node.type === "delay" && (
          <div>
            <label className="label" htmlFor="i-delay">
              Segundos
            </label>
            <input
              id="i-delay"
              type="number"
              min={1}
              max={8}
              className="input"
              value={d.seconds ?? 1}
              onChange={(e) => onChange({ seconds: Number(e.target.value) })}
            />
            <p className="mt-1.5 text-xs text-[var(--fg-dim)]">
              Máximo 8s — em serverless a função morre depois disso.
            </p>
          </div>
        )}

        {node.type === "tag" && (
          <div>
            <label className="label" htmlFor="i-tag">
              Nome da tag
            </label>
            <input
              id="i-tag"
              className="input"
              value={d.tagName ?? ""}
              onChange={(e) => onChange({ tagName: e.target.value })}
            />
          </div>
        )}

        {node.type === "condition" && (
          <>
            <div>
              <label className="label" htmlFor="i-field">
                Verificar
              </label>
              <select
                id="i-field"
                className="input"
                value={d.field ?? "is_user_follow_business"}
                onChange={(e) => onChange({ field: e.target.value as FlowNodeData["field"] })}
              >
                <option value="is_user_follow_business">Se a pessoa te segue</option>
                <option value="follower_count">Número de seguidores</option>
                <option value="has_tag">Se tem uma tag</option>
                <option value="last_text">Se o texto contém</option>
              </select>
            </div>
            {d.field === "follower_count" && (
              <div>
                <label className="label" htmlFor="i-op">
                  Comparação
                </label>
                <select
                  id="i-op"
                  className="input"
                  value={d.op ?? "gt"}
                  onChange={(e) => onChange({ op: e.target.value as FlowNodeData["op"] })}
                >
                  <option value="gt">maior que</option>
                  <option value="lt">menor que</option>
                </select>
              </div>
            )}
            {d.field !== "is_user_follow_business" && (
              <div>
                <label className="label" htmlFor="i-value">
                  Valor
                </label>
                <input
                  id="i-value"
                  className="input"
                  value={d.value ?? ""}
                  onChange={(e) => onChange({ value: e.target.value })}
                />
              </div>
            )}
            <p className="text-xs text-[var(--fg-dim)]">
              Ligue a saída de cima em &ldquo;sim&rdquo; e a de baixo em &ldquo;não&rdquo;.
            </p>
          </>
        )}
      </div>

      {node.type !== "trigger" && (
        <div className="border-t border-[var(--border)] p-4">
          <button className="btn btn-danger w-full" onClick={onDelete}>
            <Trash2 size={14} /> Apagar bloco
          </button>
        </div>
      )}
    </aside>
  );
}
