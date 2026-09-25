import { FlaskConical, LayoutDashboard, MessageCircle, Workflow, Inbox, Users } from "lucide-react";
import { Section } from "./Section";

/* Tudo aqui é ilustrativo e vem marcado como "Dados de exemplo". */

const KPIS = [
  { label: "Comentários", value: "1.284" },
  { label: "DMs enviadas", value: "1.231" },
  { label: "DMs abertas", value: "1.047" },
  { label: "Cliques no link", value: "586" },
];

const FUNNEL = [
  { label: "Comentou", pct: 100 },
  { label: "Recebeu a DM", pct: 96 },
  { label: "Abriu", pct: 82 },
  { label: "Clicou", pct: 46 },
];

const RECENT = [
  { handle: "@ana.souza", text: "EU QUERO 🙌", status: "Link clicado", tone: "chip-ok" },
  { handle: "@joao.pedro", text: "eu quero!!", status: "DM aberta", tone: "" },
  { handle: "@carla.mendes", text: "EU QUERO 🔥", status: "Esperando seguir", tone: "chip-warn" },
  { handle: "@bia.rocha", text: "Eu quero", status: "DM enviada", tone: "" },
];

/* Série de 30 dias desenhada à mão para o gráfico de área. */
const SERIES = [
  18, 22, 20, 26, 24, 30, 28, 35, 33, 40, 38, 36, 44, 52, 48, 46, 55, 60, 57, 63, 58, 66, 72, 69, 75,
  71, 80, 86, 83, 90,
];

function areaPaths(w: number, h: number) {
  const max = 100;
  const step = w / (SERIES.length - 1);
  const pts = SERIES.map((v, i) => [i * step, h - (v / max) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w} ${h} L0 ${h} Z` };
}

function AreaChart() {
  const { line, area } = areaPaths(600, 150);
  return (
    <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="h-36 w-full sm:h-40" aria-hidden>
      <defs>
        <linearGradient id="lp-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c5cff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lp-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a44dff" />
          <stop offset="1" stopColor="#f9578e" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2="600" y1={150 * f} y2={150 * f} stroke="rgba(255,255,255,0.05)" />
      ))}
      <path d={area} fill="url(#lp-area)" transform="translate(0 5)" />
      <path d={line} fill="none" stroke="url(#lp-line)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" transform="translate(0 5)" />
    </svg>
  );
}

const NAV = [
  { icon: LayoutDashboard, label: "Desempenho", active: true },
  { icon: Workflow, label: "Automações" },
  { icon: Inbox, label: "Inbox" },
  { icon: Users, label: "Contatos" },
];

export function DashboardPreview() {
  return (
    <Section
      id="painel"
      eyebrow="Painel em ação"
      title="Veja o que cada post está trazendo"
      lead="Do comentário ao clique: quantas DMs saíram, quantas foram abertas e em qual etapa as pessoas param."
    >
      <div data-reveal className="relative mt-14">
        <div aria-hidden className="lp-glow left-1/2 top-10 h-72 w-[70%] -translate-x-1/2 bg-[rgba(124,92,255,0.18)]" />

        <figure
          className="lp-window relative overflow-hidden"
          aria-label="Maquete do painel de desempenho com dados de exemplo"
        >
          {/* Barra da janela */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <span aria-hidden className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]/70" />
            </span>
            <span className="truncate text-xs text-[var(--fg-muted)]">Desempenho · últimos 30 dias</span>
            <span className="chip chip-warn ml-auto">
              <FlaskConical size={11} aria-hidden /> Dados de exemplo
            </span>
          </div>

          <div className="flex">
            {/* Menu lateral (só em telas largas) */}
            <nav aria-hidden className="hidden w-48 shrink-0 border-r border-white/[0.06] p-3 lg:block">
              {NAV.map((n) => (
                <span key={n.label} className={`nav-item ${n.active ? "nav-item-active" : ""}`}>
                  <n.icon size={15} /> {n.label}
                </span>
              ))}
            </nav>

            <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
              {/* KPIs */}
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {KPIS.map((k) => (
                  <div key={k.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
                    <dt className="text-xs text-[var(--fg-muted)]">{k.label}</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{k.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                {/* Gráfico */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm font-medium">DMs enviadas por dia</p>
                  <AreaChart />
                </div>

                {/* Funil */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm font-medium">Funil</p>
                  <ul className="mt-4 space-y-3">
                    {FUNNEL.map((f) => (
                      <li key={f.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--lp-soft)]">{f.label}</span>
                          <span className="font-medium">{f.pct}%</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: "var(--brand)" }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Comentários recentes */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MessageCircle size={14} aria-hidden /> Comentários recentes
                </p>
                <ul className="mt-3 divide-y divide-white/[0.05]">
                  {RECENT.map((r) => (
                    <li key={r.handle} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm">
                        <span className="font-semibold">{r.handle}</span>{" "}
                        <span className="text-[var(--fg-muted)]">{r.text}</span>
                      </span>
                      <span className={`chip ${r.tone}`}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </Section>
  );
}
