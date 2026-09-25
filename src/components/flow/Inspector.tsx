"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import type { FlowButton, FlowNode, FlowNodeData } from "@/lib/flow/types";
import { CATALOG_LIMITS } from "@/lib/catalog";
import { useCatalog } from "./catalog-context";
import { KIND_META } from "./meta";

type Props = {
  node: FlowNode | null;
  /** O que mostrar quando nenhum bloco esta selecionado (resumo do fluxo). */
  empty: React.ReactNode;
  onChange: (data: Partial<FlowNodeData>) => void;
  onDelete: () => void;
};

export function Inspector({ node, empty, onChange, onDelete }: Props) {
  if (!node) {
    return (
      <aside className="w-[320px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-elev)]">{empty}</aside>
    );
  }

  const d = node.data;
  const buttons = d.buttons ?? [];

  function setButton(i: number, patch: Partial<FlowButton>) {
    const next = buttons.map((b, idx) => (idx === i ? ({ ...b, ...patch } as FlowButton) : b));
    onChange({ buttons: next });
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        {(() => {
          const { label, hint, icon: Icon, color } = KIND_META[node.type];
          return (
            <>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-tight">{label}</h2>
                <p className="truncate text-[11px] text-[var(--fg-dim)]">{hint}</p>
              </div>
            </>
          );
        })()}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {(node.type === "text" ||
          node.type === "buttons" ||
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

        {(node.type === "text" || node.type === "buttons") && (
          <TextVariants
            variants={d.textVariants ?? []}
            onChange={(textVariants) => onChange({ textVariants })}
          />
        )}

        {node.type === "text" && (
          <div className="card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--fg-dim)]">Link anexado no texto</span>
              {d.link?.url && (
                <button
                  type="button"
                  className="text-[11px] text-[var(--danger)] hover:underline"
                  onClick={() => onChange({ link: undefined })}
                >
                  Remover link
                </button>
              )}
            </div>
            <input
              className="input font-mono text-xs"
              placeholder="https://… (opcional)"
              value={d.link?.url ?? ""}
              onChange={(e) => {
                const val = e.target.value.trim();
                onChange({ link: val ? { url: val, label: d.link?.label } : undefined });
              }}
            />
            <p className="text-[10px] text-[var(--fg-dim)]">
              Se preenchido, o link vai anexado ao fim desta mensagem. Deixe vazio se estiver usando um bloco de Botões conectado.
            </p>
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
              {buttons.map((b, i) => {
                const isUrl = b.kind !== "reply";
                return (
                  <div key={i} className="card space-y-2.5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-dim)]">
                        Botão {i + 1}
                      </span>
                      <div className="flex rounded-md border border-[var(--border)] p-0.5 text-[11px]">
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 transition-colors ${isUrl ? "bg-[var(--accent)] text-white" : "text-[var(--fg-muted)]"}`}
                          onClick={() => setButton(i, { kind: "url", url: ("url" in b ? b.url : "") || "" })}
                        >
                          Link (URL)
                        </button>
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 transition-colors ${!isUrl ? "bg-[var(--accent)] text-white" : "text-[var(--fg-muted)]"}`}
                          onClick={() => setButton(i, { kind: "reply", payload: ("payload" in b ? b.payload : "") || "" })}
                        >
                          Ação (Payload)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] text-[var(--fg-dim)]">
                        Texto exibido no botão
                      </label>
                      <input
                        className="input"
                        placeholder="Ex: Ver produto, Comprar agora"
                        value={b.label}
                        onChange={(e) => setButton(i, { label: e.target.value })}
                      />
                    </div>

                    {isUrl ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--accent)]">
                          Link do produto / URL de destino
                        </label>
                        <input
                          className="input font-mono text-xs"
                          placeholder="https://seusite.com/produto"
                          value={"url" in b ? b.url : ""}
                          onChange={(e) => setButton(i, { url: e.target.value } as Partial<FlowButton>)}
                        />
                        <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                          O Instagram enviará este link como botão clicável na DM.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--fg-dim)]">
                          Payload (identificador interno)
                        </label>
                        <input
                          className="input font-mono text-xs"
                          placeholder="ex: flow:123 ou action_name"
                          value={"payload" in b ? b.payload : ""}
                          onChange={(e) =>
                            setButton(i, { payload: e.target.value } as Partial<FlowButton>)
                          }
                        />
                      </div>
                    )}

                    <button
                      className="btn btn-danger w-full mt-1"
                      onClick={() => onChange({ buttons: buttons.filter((_, idx) => idx !== i) })}
                    >
                      <Trash2 size={14} /> Remover botão
                    </button>
                  </div>
                );
              })}
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

        {node.type === "carousel" && (
          <CarouselFields items={d.items ?? []} onChange={(items) => onChange({ items })} />
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

function CarouselFields({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const catalog = useCatalog();
  const available = catalog.items.filter((i) => !items.includes(i.id));
  const full = items.length >= CATALOG_LIMITS.cards;

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="label">
          Cards ({items.length}/{CATALOG_LIMITS.cards})
        </span>
        <div className="space-y-1.5">
          {items.map((id, i) => {
            const item = catalog.byId.get(id);
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-1.5"
              >
                {item ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded bg-[var(--bg-elev-2)]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs">
                    {item?.title ?? (catalog.loading ? "carregando…" : "item removido")}
                  </div>
                  {item && (
                    <div className="truncate text-[10px] text-[var(--fg-dim)]">
                      {item.button_action === "flow" ? "continua o fluxo" : "abre link"} ·{" "}
                      {item.button_label}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label="Subir"
                    className="text-[var(--fg-dim)] hover:text-[var(--fg)] disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descer"
                    className="text-[var(--fg-dim)] hover:text-[var(--fg)] disabled:opacity-30"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remover card"
                  className="shrink-0 text-[var(--fg-dim)] hover:text-[var(--danger)]"
                  onClick={() => onChange(items.filter((x) => x !== id))}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {catalog.error ? (
        <p className="text-xs text-[var(--danger)]">{catalog.error}</p>
      ) : (
        <select
          className="input"
          value=""
          disabled={full || !available.length}
          onChange={(e) => e.target.value && onChange([...items, e.target.value])}
        >
          <option value="">
            {full
              ? "Limite de 10 cards"
              : available.length
                ? "Adicionar item do catálogo…"
                : catalog.items.length
                  ? "Todos os itens já estão aqui"
                  : "Catálogo vazio"}
          </option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
      )}

      <Link href="/dashboard/catalogo" target="_blank" className="block text-xs text-[var(--accent)] hover:underline">
        Gerenciar catálogo ↗
      </Link>

      <p className="text-xs text-[var(--fg-dim)]">
        Cards que &ldquo;continuam o fluxo&rdquo; ganham uma saída própria no bloco: ligue cada uma
        ao passo que o clique deve abrir. A saída de baixo segue logo após o envio.
      </p>
      <p className="text-xs text-[var(--warn)]">
        Não funciona como resposta a comentário. Em fluxo de comentário, coloque o carrossel depois
        de um botão (ex.: &ldquo;JÁ TE SEGUI&rdquo;), quando a conversa já estiver aberta.
      </p>
    </div>
  );
}

function TextVariants({
  variants,
  onChange,
}: {
  variants: string[];
  onChange: (variants: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="label">Variações da mensagem ({variants.length})</span>
      {variants.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <textarea
            rows={3}
            className="input resize-none"
            value={v}
            onChange={(e) => onChange(variants.map((x, idx) => (idx === i ? e.target.value : x)))}
          />
          <button
            type="button"
            aria-label="Remover variação"
            className="shrink-0 self-start pt-2 text-[var(--fg-dim)] hover:text-[var(--danger)]"
            onClick={() => onChange(variants.filter((_, idx) => idx !== i))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className="btn btn-ghost w-full" onClick={() => onChange([...variants, ""])}>
        <Plus size={14} /> Adicionar variação
      </button>
      <p className="text-[10px] text-[var(--fg-dim)]">
        A cada envio sai uma sorteada entre a mensagem principal e estas. Mandar sempre a mesma
        frase é o que o antispam do Instagram mais pega.
      </p>
    </div>
  );
}
