import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  MessageCircle,
  MessagesSquare,
  MousePointerClick,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ActivityChart, type ActivityPoint } from "@/components/ActivityChart";
import { Avatar, Bar, Kpi, Page, Panel, PanelLink } from "@/components/ui";
import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import { PENDING_PREFIX } from "@/lib/meta/token";
import { timeAgo } from "@/lib/utils";

export const revalidate = 60;

const DAYS = 14;
const DAY_MS = 86_400_000;

type Recent = {
  id: string;
  from_username: string | null;
  text: string | null;
  dm_sent: boolean;
  matched_trigger_id: string | null;
  created_at: string;
};

type LiveTrigger = {
  id: string;
  keywords: string[] | null;
  enabled: boolean;
  flows: { name: string | null; sent_count: number | null } | null;
};

async function loadStats(accountId: string) {
  const supabase = db();
  const since = new Date(Date.now() - DAYS * DAY_MS).toISOString();
  const before = new Date(Date.now() - 2 * DAYS * DAY_MS).toISOString();

  const count = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("account_id", accountId);

  const [
    contacts,
    dms,
    dmsPrev,
    comments,
    commentsPrev,
    matched,
    dmSent,
    clicks,
    triggers,
    dmRows,
    commentRows,
    recent,
    live,
  ] = await Promise.all([
    count("mc_contacts"),
    count("mc_messages").eq("direction", "out").eq("sender", "bot").gte("created_at", since),
    count("mc_messages").eq("direction", "out").eq("sender", "bot").gte("created_at", before).lt("created_at", since),
    count("mc_comment_events").gte("created_at", since),
    count("mc_comment_events").gte("created_at", before).lt("created_at", since),
    count("mc_comment_events").gte("created_at", since).not("matched_trigger_id", "is", null),
    count("mc_comment_events").gte("created_at", since).eq("dm_sent", true),
    count("mc_links").gte("created_at", since).gt("click_count", 0),
    count("mc_triggers").eq("enabled", true),
    supabase
      .from("mc_messages")
      .select("created_at")
      .eq("account_id", accountId)
      .eq("direction", "out")
      .eq("sender", "bot")
      .gte("created_at", since),
    supabase.from("mc_comment_events").select("created_at").eq("account_id", accountId).gte("created_at", since),
    supabase
      .from("mc_comment_events")
      .select("id, from_username, text, dm_sent, matched_trigger_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(9),
    supabase
      .from("mc_triggers")
      .select("id, keywords, enabled, flows:mc_flows(name, sent_count)")
      .eq("account_id", accountId)
      .eq("enabled", true)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  // Eixo do grafico com todos os dias, inclusive os zerados.
  const buckets = new Map<string, ActivityPoint>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    buckets.set(d.toISOString().slice(0, 10), {
      day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      dms: 0,
      comentarios: 0,
    });
  }
  for (const row of dmRows.data ?? []) {
    const b = buckets.get(String(row.created_at).slice(0, 10));
    if (b) b.dms += 1;
  }
  for (const row of commentRows.data ?? []) {
    const b = buckets.get(String(row.created_at).slice(0, 10));
    if (b) b.comentarios += 1;
  }

  return {
    contacts: contacts.count ?? 0,
    dms: dms.count ?? 0,
    dmsPrev: dmsPrev.count ?? 0,
    comments: comments.count ?? 0,
    commentsPrev: commentsPrev.count ?? 0,
    matched: matched.count ?? 0,
    dmSent: dmSent.count ?? 0,
    clicks: clicks.count ?? 0,
    activeTriggers: triggers.count ?? 0,
    chart: [...buckets.values()],
    recent: (recent.data ?? []) as Recent[],
    live: (live.data ?? []) as unknown as LiveTrigger[],
  };
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Passo do "comece por aqui": some sozinho quando tudo estiver feito. */
function Step({ done, title, text, href, cta }: { done: boolean; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/40 p-3">
      <span
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
        style={done ? { background: "var(--success)" } : { border: "1.5px solid var(--border-strong)" }}
      >
        {done && <Check size={12} className="text-[#04130d]" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{text}</p>
      </div>
      {!done && (
        <Link href={href} className="btn btn-ghost shrink-0 !px-3 !py-1.5 text-xs">
          {cta}
        </Link>
      )}
    </div>
  );
}

export default async function OverviewPage() {
  const account = await getAccountCached().catch(() => null);

  if (!account) {
    return (
      <>
        <PageHeader title="Visão geral" subtitle="Vamos conectar sua conta primeiro." />
        <Page>
          <Panel title="Ainda não conectei ao seu Instagram">
            <p className="max-w-xl text-sm leading-relaxed text-[var(--fg-muted)]">
              Entre em Configurações e toque em Conectar Instagram para começar.
            </p>
            <Link href="/dashboard/configuracoes" className="btn btn-primary mt-4">
              Ir para configurações <ArrowUpRight size={15} />
            </Link>
          </Panel>
        </Page>
      </>
    );
  }

  const connected = !account.ig_user_id.startsWith(PENDING_PREFIX);
  const s = await loadStats(account.id);
  const dmSpark = s.chart.map((p) => p.dms);
  const commentSpark = s.chart.map((p) => p.comentarios);

  const funnel = [
    { label: "Comentários capturados", value: s.comments, color: "linear-gradient(90deg,#f9578e,#a44dff)" },
    { label: "Acionaram uma automação", value: s.matched, color: "linear-gradient(90deg,#a44dff,#7c5cff)" },
    { label: "Receberam a DM", value: s.dmSent, color: "linear-gradient(90deg,#7c5cff,#5b6bff)" },
    ...(s.clicks > 0
      ? [{ label: "Clicaram no link", value: s.clicks, color: "linear-gradient(90deg,#34d399,#0ea5e9)" }]
      : []),
  ];
  const top = Math.max(s.comments, 1);
  const showSetup = !connected || s.activeTriggers === 0;

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle={connected ? `@${account.username ?? account.ig_user_id} · últimos ${DAYS} dias` : "Instagram ainda não conectado"}
        action={
          <Link href="/dashboard/automacoes" className="btn btn-primary">
            Nova automação
          </Link>
        }
      />

      <Page className="rise">
        {showSetup && (
          <Panel title="Comece por aqui" subtitle="Três passos e sua primeira DM automática está no ar">
            <div className="grid gap-2.5 lg:grid-cols-3">
              <Step
                done={connected}
                title="Conectar o Instagram"
                text="Autorize a sua conta profissional."
                href="/dashboard/configuracoes"
                cta="Conectar"
              />
              <Step
                done={s.activeTriggers > 0}
                title="Criar uma automação"
                text="Escolha um Reel e a palavra-chave."
                href="/dashboard/automacoes"
                cta="Criar"
              />
              <Step
                done={s.dmSent > 0}
                title="Receber o primeiro comentário"
                text="Comente o post com a palavra e veja a DM chegar."
                href="/dashboard/reels"
                cta="Ver posts"
              />
            </div>
          </Panel>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={Users}
            label="Contatos"
            value={fmt(s.contacts)}
            hint="pessoas que interagiram"
            tone="linear-gradient(135deg,#7c5cff,#5b6bff)"
          />
          <Kpi
            icon={MessagesSquare}
            label="DMs enviadas"
            value={fmt(s.dms)}
            hint={`vs. ${fmt(s.dmsPrev)} antes`}
            now={s.dms}
            prev={s.dmsPrev}
            spark={dmSpark}
            sparkColor="#7c5cff"
            tone="linear-gradient(135deg,#a44dff,#7c5cff)"
          />
          <Kpi
            icon={MessageCircle}
            label="Comentários"
            value={fmt(s.comments)}
            hint={`vs. ${fmt(s.commentsPrev)} antes`}
            now={s.comments}
            prev={s.commentsPrev}
            spark={commentSpark}
            sparkColor="#34d399"
            tone="linear-gradient(135deg,#f9578e,#a44dff)"
          />
          <Kpi
            icon={Zap}
            label="Automações ativas"
            value={fmt(s.activeTriggers)}
            hint="gatilhos ligados agora"
            tone="linear-gradient(135deg,#34d399,#0ea5e9)"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Atividade"
            subtitle={`comentários recebidos e DMs enviadas, ${DAYS} dias`}
            action={
              <div className="flex items-center gap-4 text-[11px] text-[var(--fg-muted)]">
                <span className="flex items-center gap-1.5">
                  <i className="dot" style={{ background: "var(--accent)" }} /> DMs
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="dot dot-ok" /> Comentários
                </span>
              </div>
            }
          >
            <ActivityChart data={s.chart} height={250} />
          </Panel>

          <Panel title="Funil de conversão" subtitle="do comentário até a DM entregue">
            <ul className="space-y-4 pt-1">
              {funnel.map((step, i) => (
                <li key={step.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-[var(--fg-muted)]">{step.label}</span>
                    <span className="tabular-nums">
                      <strong className="font-semibold">{fmt(step.value)}</strong>
                      {i > 0 && (
                        <span className="ml-1.5 text-[11px] text-[var(--fg-dim)]">
                          {Math.round((step.value / top) * 100)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <Bar pct={(step.value / top) * 100} color={step.color} />
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg bg-[var(--bg-elev-2)]/60 px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">
              Comentários sem palavra-chave não entram no funil de DM.
            </p>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Comentários recentes"
            action={<PanelLink href="/dashboard/automacoes">ver automações</PanelLink>}
            flush
          >
            {s.recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--fg-dim)]">
                Nada ainda. Assim que alguém comentar num post seu, aparece aqui.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {s.recent.map((c) => (
                  <li key={c.id} className="row-hover flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={c.from_username} size={28} />
                    <p className="min-w-0 flex-1 truncate text-[13px]">
                      <span className="font-medium">@{c.from_username ?? "desconhecido"}</span>{" "}
                      <span className="text-[var(--fg-muted)]">{c.text}</span>
                    </p>
                    <span className={c.dm_sent ? "chip chip-ok" : c.matched_trigger_id ? "chip chip-danger" : "chip"}>
                      {c.dm_sent ? "DM enviada" : c.matched_trigger_id ? "falhou" : "sem gatilho"}
                    </span>
                    <span className="w-10 text-right text-[11px] text-[var(--fg-dim)]">{timeAgo(c.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Automações no ar" action={<PanelLink href="/dashboard/automacoes">gerenciar</PanelLink>} flush>
            {s.live.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--fg-dim)]">Nenhuma automação ligada.</p>
                <Link href="/dashboard/automacoes" className="btn btn-ghost mt-3">
                  Criar a primeira
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {s.live.map((t) => (
                  <li key={t.id} className="row-hover flex items-center gap-3 px-4 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Workflow size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{t.flows?.name ?? "Fluxo"}</p>
                      <p className="truncate text-[11px] text-[var(--fg-dim)]">
                        {(t.keywords ?? []).join(", ") || "qualquer comentário"}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] tabular-nums text-[var(--fg-muted)]">
                      <MousePointerClick size={11} />
                      {fmt(t.flows?.sent_count ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Page>
    </>
  );
}
