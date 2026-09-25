import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pecas visuais compartilhadas pelas telas do painel. Sem estado: servem tanto
 * em pagina de servidor quanto de cliente. Manter o painel consistente e mais
 * facil com poucas pecas do que com um estilo por tela.
 */

/** Largura e ritmo padrao de uma tela: aproveita o espaco sem esticar demais. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] space-y-4 px-6 py-5", className)}>{children}</div>
  );
}

/** Cartao com cabecalho (titulo, subtitulo, acao). `flush` tira o padding do corpo (listas). */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  flush,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("card flex min-w-0 flex-col", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13px] font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-[var(--fg-dim)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("min-h-0 flex-1", flush ? "pt-2" : "px-4 pb-4 pt-2")}>{children}</div>
    </section>
  );
}

/** Link discreto de "ver tudo" para o canto do cabecalho de um Panel. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-[11px] font-medium text-[var(--accent)] hover:underline">
      {children}
    </Link>
  );
}

const AVATAR_TONES = [
  "linear-gradient(135deg,#7c5cff,#5b6bff)",
  "linear-gradient(135deg,#f9578e,#a44dff)",
  "linear-gradient(135deg,#34d399,#0ea5e9)",
  "linear-gradient(135deg,#fbbf24,#f9578e)",
  "linear-gradient(135deg,#0ea5e9,#7c5cff)",
];

/** Bolinha com a inicial e uma cor estavel por nome: da rosto a listas sem foto. */
export function Avatar({
  name,
  src,
  size = 30,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const label = (name ?? "?").replace(/^@/, "");
  const tone = AVATAR_TONES[[...label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-[var(--border-strong)]", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold uppercase text-white", className)}
      style={{ width: size, height: size, background: tone, fontSize: Math.max(10, size * 0.4) }}
    >
      {label.slice(0, 1)}
    </span>
  );
}

/** Mini grafico de linha sem eixos, para caber dentro de um KPI. */
export function Sparkline({
  values,
  color = "#7c5cff",
  height = 30,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  if (values.length < 2) return null;
  const w = 100;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-[30px] w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Variacao percentual contra o periodo anterior (verde sobe, vermelho cai). */
export function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return null;
  if (!prev) return <span className="chip chip-ok">novo</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("chip", up ? "chip-ok" : "chip-danger")}>
      <Icon size={11} />
      {Math.abs(pct)}%
    </span>
  );
}

/** Indicador de numero com icone, variacao e mini grafico. */
export function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  hint,
  now,
  prev,
  spark,
  sparkColor,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  /** Gradiente do quadradinho do icone. */
  tone: string;
  hint?: string;
  now?: number;
  prev?: number;
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="card card-hover relative overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
            style={{ background: tone, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
          >
            <Icon size={14} className="text-white" />
          </span>
          <span className="truncate text-xs font-medium text-[var(--fg-muted)]">{label}</span>
        </div>
        {now !== undefined && prev !== undefined && <Delta now={now} prev={prev} />}
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        {hint && <p className="text-[11px] text-[var(--fg-dim)]">{hint}</p>}
        {spark && (
          <div className="ml-auto w-[45%] min-w-[64px]">
            <Sparkline values={spark} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Barra de progresso fina em degrade. */
export function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color ?? "var(--brand)" }}
      />
    </div>
  );
}
