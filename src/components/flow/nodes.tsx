"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Clock,
  GitBranch,
  Image as ImageIcon,
  ListChecks,
  MessageSquare,
  MousePointerClick,
  Tag,
  Zap,
} from "lucide-react";
import type { FlowNodeData } from "@/lib/flow/types";

const shell =
  "min-w-[210px] max-w-[260px] rounded-xl border bg-[var(--bg-elev)] text-[13px] shadow-lg transition-colors";

function Header({
  icon: Icon,
  title,
  tone = "accent",
}: {
  icon: typeof Zap;
  title: string;
  tone?: "accent" | "green" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-[var(--success)]"
      : tone === "amber"
        ? "text-[var(--warn)]"
        : "text-[var(--accent)]";
  return (
    <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
      <Icon size={13} className={color} />
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">
        {title}
      </span>
    </div>
  );
}

function Body({ children, empty }: { children?: React.ReactNode; empty: string }) {
  return (
    <div className="px-3 py-2.5 leading-snug">
      {children || <span className="text-[var(--fg-dim)]">{empty}</span>}
    </div>
  );
}

type Props = NodeProps & { data: FlowNodeData };

export function TriggerNode({ selected }: Props) {
  return (
    <div
      className={`${shell} ${selected ? "border-[var(--accent)]" : "border-[var(--border-strong)]"}`}
    >
      <Header icon={Zap} title="Gatilho" tone="green" />
      <Body empty="">
        <span className="text-[var(--fg-muted)]">
          Começa aqui quando a automação dispara.
        </span>
      </Body>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function Standard({
  selected,
  icon,
  title,
  tone,
  children,
  empty,
}: {
  selected: boolean;
  icon: typeof Zap;
  title: string;
  tone?: "accent" | "green" | "amber";
  children?: React.ReactNode;
  empty: string;
}) {
  return (
    <div className={`${shell} ${selected ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
      <Handle type="target" position={Position.Left} />
      <Header icon={icon} title={title} tone={tone} />
      <Body empty={empty}>{children}</Body>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function TextNode({ data, selected }: Props) {
  return (
    <Standard selected={!!selected} icon={MessageSquare} title="Mensagem" empty="mensagem vazia">
      {data.text && <p className="whitespace-pre-wrap">{data.text}</p>}
    </Standard>
  );
}

export function ImageNode({ data, selected }: Props) {
  return (
    <Standard selected={!!selected} icon={ImageIcon} title="Imagem" empty="sem URL">
      {data.url && (
        <span className="block truncate font-mono text-[11px] text-[var(--fg-muted)]">
          {data.url}
        </span>
      )}
    </Standard>
  );
}

export function ButtonsNode({ data, selected }: Props) {
  return (
    <Standard selected={!!selected} icon={MousePointerClick} title="Botões" empty="sem botões">
      {data.text && <p className="mb-2 whitespace-pre-wrap">{data.text}</p>}
      <div className="space-y-1.5">
        {(data.buttons ?? []).map((b, i) => (
          <div
            key={i}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-center text-[12px]"
          >
            <div className="font-medium text-[var(--accent)]">{b.label || "Sem rótulo"}</div>
            {b.kind === "url" || (!("kind" in b) && "url" in b) ? (
              <div
                className="mt-0.5 truncate font-mono text-[10px] text-[var(--fg-dim)]"
                title={"url" in b ? (b as { url?: string }).url : ""}
              >
                {"url" in b && (b as { url?: string }).url ? (b as { url?: string }).url : "sem link configurado"}
              </div>
            ) : (
              <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--fg-dim)]">
                payload: {"payload" in b ? (b as { payload?: string }).payload : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </Standard>
  );
}

export function QuickRepliesNode({ data, selected }: Props) {
  return (
    <Standard
      selected={!!selected}
      icon={ListChecks}
      title="Respostas rápidas"
      empty="sem opções"
    >
      {data.text && <p className="mb-2 whitespace-pre-wrap">{data.text}</p>}
      <div className="flex flex-wrap gap-1">
        {(data.options ?? []).map((o, i) => (
          <span key={i} className="chip">
            {o.label}
          </span>
        ))}
      </div>
    </Standard>
  );
}

export function DelayNode({ data, selected }: Props) {
  return (
    <Standard selected={!!selected} icon={Clock} title="Espera" tone="amber" empty="—">
      <span>{data.seconds ?? 1}s antes do próximo passo</span>
    </Standard>
  );
}

export function TagNode({ data, selected }: Props) {
  return (
    <Standard selected={!!selected} icon={Tag} title="Aplicar tag" empty="sem tag">
      {data.tagName && <span className="chip">{data.tagName}</span>}
    </Standard>
  );
}

const FIELD_LABEL: Record<string, string> = {
  is_user_follow_business: "segue você",
  follower_count: "nº de seguidores",
  has_tag: "tem a tag",
  last_text: "texto contém",
};

export function ConditionNode({ data, selected }: Props) {
  return (
    <div className={`${shell} ${selected ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
      <Handle type="target" position={Position.Left} />
      <Header icon={GitBranch} title="Condição" tone="amber" />
      <div className="px-3 py-2.5">
        <p>
          {FIELD_LABEL[data.field ?? ""] ?? "—"}
          {data.value ? (
            <span className="text-[var(--fg-muted)]"> · {data.value}</span>
          ) : null}
        </p>
        <div className="mt-2 flex justify-between text-[11px]">
          <span className="text-[var(--success)]">sim ↗</span>
          <span className="text-[var(--danger)]">não ↘</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="yes" style={{ top: "62%" }} />
      <Handle type="source" position={Position.Right} id="no" style={{ top: "84%" }} />
    </div>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  text: TextNode,
  image: ImageNode,
  buttons: ButtonsNode,
  quickReplies: QuickRepliesNode,
  delay: DelayNode,
  tag: TagNode,
  condition: ConditionNode,
};
