"use client";

import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { Check, Link2, Shuffle, X } from "lucide-react";
import type { FlowNodeData, NodeKind } from "@/lib/flow/types";
import { cardHandle } from "@/lib/catalog";
import { useCatalog } from "./catalog-context";
import { KIND_META } from "./meta";

/**
 * Cartao de um bloco: faixa colorida do tipo + icone + titulo, e o corpo mostra
 * o que o bloco vai fazer (a mensagem como balao, os botoes como botoes). O
 * anel de selecao usa a cor do proprio bloco.
 */
function Card({
  kind,
  selected,
  children,
  width = 230,
  extraBottom = 0,
}: {
  kind: NodeKind;
  selected: boolean;
  children?: React.ReactNode;
  width?: number;
  extraBottom?: number;
}) {
  const { label, icon: Icon, color } = KIND_META[kind];
  return (
    <div
      className="rounded-2xl border bg-[var(--bg-elev)] text-[13px] transition-shadow"
      style={{
        width,
        paddingBottom: extraBottom,
        borderColor: selected ? color : "var(--border-strong)",
        boxShadow: selected
          ? `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent), 0 18px 40px -16px rgba(0,0,0,0.7)`
          : "0 10px 28px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-2 px-3 pb-1.5 pt-2.5">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          <Icon size={13} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

const Body = ({ children }: { children: React.ReactNode }) => <div className="px-3 pb-3 pt-1">{children}</div>;
const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] italic text-[var(--fg-dim)]">{children}</p>
);

type Props = NodeProps & { data: FlowNodeData };

function VariantsBadge({ data }: { data: FlowNodeData }) {
  const n = (data.textVariants ?? []).filter((t) => t.trim()).length;
  if (!n) return null;
  return (
    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
      <Shuffle size={10} /> +{n} variaç{n === 1 ? "ão" : "ões"}
    </span>
  );
}

/** Texto como balao de conversa: e assim que a pessoa vai enxergar. */
function Bubble({ text }: { text?: string }) {
  if (!text) return <Empty>mensagem vazia</Empty>;
  return (
    <p className="line-clamp-5 whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[var(--bg-elev-2)] px-3 py-2 leading-snug">
      {text}
    </p>
  );
}

export function TriggerNode({ selected }: Props) {
  return (
    <Card kind="trigger" selected={!!selected} width={200}>
      <Body>
        <p className="leading-snug text-[var(--fg-muted)]">Começa aqui quando a automação dispara.</p>
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export function TextNode({ data, selected }: Props) {
  return (
    <Card kind="text" selected={!!selected}>
      <Handle type="target" position={Position.Left} />
      <Body>
        <Bubble text={data.text} />
        <VariantsBadge data={data} />
        {data.link?.url && (
          <p
            className="mt-2 flex items-center gap-1.5 truncate rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-[10px] text-[var(--accent)]"
            title={data.link.url}
          >
            <Link2 size={11} className="shrink-0" />
            <span className="truncate">{data.link.url}</span>
          </p>
        )}
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export function ImageNode({ data, selected }: Props) {
  return (
    <Card kind="image" selected={!!selected}>
      <Handle type="target" position={Position.Left} />
      <Body>
        {data.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.url} alt="" className="max-h-28 w-full rounded-lg bg-[var(--bg-elev-2)] object-cover" />
        ) : (
          <Empty>sem imagem</Empty>
        )}
        {data.text && <p className="mt-2 line-clamp-2 text-[12px] text-[var(--fg-muted)]">{data.text}</p>}
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export function ButtonsNode({ data, selected }: Props) {
  const buttons = data.buttons ?? [];
  return (
    <Card kind="buttons" selected={!!selected} width={240}>
      <Handle type="target" position={Position.Left} />
      <Body>
        <Bubble text={data.text} />
        <VariantsBadge data={data} />
        {buttons.length === 0 ? (
          <p className="mt-2 text-[12px] italic text-[var(--fg-dim)]">sem botões</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {buttons.map((b, i) => {
              const isUrl = b.kind !== "reply";
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5"
                >
                  <span className="truncate text-[12px] font-medium">{b.label || "Sem rótulo"}</span>
                  <span className="shrink-0 text-[10px] text-[var(--fg-dim)]">{isUrl ? "link" : "ação"}</span>
                </div>
              );
            })}
          </div>
        )}
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export function DelayNode({ data, selected }: Props) {
  return (
    <Card kind="delay" selected={!!selected} width={190}>
      <Handle type="target" position={Position.Left} />
      <Body>
        <p className="text-[var(--fg-muted)]">
          Aguarda <strong className="text-[var(--fg)]">{data.seconds ?? 1}s</strong>
        </p>
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export function TagNode({ data, selected }: Props) {
  return (
    <Card kind="tag" selected={!!selected} width={200}>
      <Handle type="target" position={Position.Left} />
      <Body>
        {data.tagName ? <span className="chip">{data.tagName}</span> : <Empty>sem tag</Empty>}
      </Body>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

const FIELD_LABEL: Record<string, string> = {
  is_user_follow_business: "Segue você?",
  follower_count: "Nº de seguidores",
  has_tag: "Tem a tag",
  last_text: "Texto contém",
};

/** Saida rotulada: o handle fica na propria linha, entao a aresta sai de onde o texto diz. */
function Branch({ id, yes }: { id: string; yes: boolean }) {
  return (
    <div className="relative flex items-center justify-between px-3 py-1.5">
      <span
        className="flex items-center gap-1.5 text-[12px] font-medium"
        style={{ color: yes ? "var(--success)" : "var(--danger)" }}
      >
        {yes ? <Check size={12} /> : <X size={12} />}
        {yes ? "Sim" : "Não"}
      </span>
      <Handle type="source" position={Position.Right} id={id} style={{ right: -6 }} />
    </div>
  );
}

export function ConditionNode({ data, selected }: Props) {
  return (
    <Card kind="condition" selected={!!selected} width={220}>
      <Handle type="target" position={Position.Left} />
      <Body>
        <p className="font-medium">
          {FIELD_LABEL[data.field ?? ""] ?? "Escolha a condição"}
          {data.value ? <span className="font-normal text-[var(--fg-muted)]"> · {data.value}</span> : null}
        </p>
      </Body>
      <div className="border-t border-[var(--border)]">
        <Branch id="yes" yes />
        <Branch id="no" yes={false} />
      </div>
    </Card>
  );
}

/**
 * Carrossel do catalogo. Cada card com botao "flow" ganha uma saida propria —
 * e ela que diz para onde o clique leva, como o sim/nao da condicao. A saida
 * "em seguida" (embaixo) e a continuacao imediata apos o envio.
 */
export function CarouselNode({ id, data, selected }: Props) {
  const { byId, loading } = useCatalog();
  const ids = data.items ?? [];
  const updateNodeInternals = useUpdateNodeInternals();

  // Saidas mudam conforme os cards: o React Flow so as enxerga se avisado.
  const handleKey = ids.map((itemId) => `${itemId}:${byId.get(itemId)?.button_action ?? ""}`).join(",");
  useEffect(() => updateNodeInternals(id), [id, handleKey, updateNodeInternals]);

  return (
    <Card kind="carousel" selected={!!selected} width={250} extraBottom={22}>
      <Handle type="target" position={Position.Left} />
      <div className="space-y-1.5 px-3 pb-2 pt-1">
        {!ids.length && <Empty>sem cards</Empty>}
        {ids.map((itemId, i) => {
          const item = byId.get(itemId);
          return (
            <div
              key={itemId}
              className="relative flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[var(--bg-elev-2)] text-[10px] text-[var(--fg-dim)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px]">
                  {item?.title ?? (loading ? "carregando…" : "item removido do catálogo")}
                </div>
                {item && (
                  <div className="truncate text-[10px] text-[var(--fg-dim)]">
                    {item.button_action === "flow" ? "↗ " : "🔗 "}
                    {item.button_label}
                  </div>
                )}
              </div>
              {item?.button_action === "flow" && (
                <Handle type="source" position={Position.Right} id={cardHandle(itemId)} style={{ right: -13 }} />
              )}
            </div>
          );
        })}
      </div>
      <span className="absolute bottom-1.5 right-3 text-[10px] text-[var(--fg-dim)]">em seguida ↓</span>
      <Handle type="source" position={Position.Bottom} id="next" />
    </Card>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  text: TextNode,
  image: ImageNode,
  buttons: ButtonsNode,
  delay: DelayNode,
  tag: TagNode,
  condition: ConditionNode,
  carousel: CarouselNode,
};
