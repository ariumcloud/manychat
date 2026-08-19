import Link from "next/link";
import { ArrowUpRight, MessageCircle, MessagesSquare, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ActivityChart, type ActivityPoint } from "@/components/ActivityChart";
import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import { configStatus } from "@/lib/env";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAYS = 14;

type Stats = {
  contacts: number;
  dmsSent: number;
  comments: number;
  activeTriggers: number;
  chart: ActivityPoint[];
  recent: Array<{
    id: string;
    from_username: string | null;
    text: string | null;
    dm_sent: boolean;
    matched_trigger_id: string | null;
    created_at: string;
  }>;
};

async function loadStats(accountId: string): Promise<Stats> {
  const supabase = db();
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString();

  const [contacts, dms, comments, triggers, dmRows, commentRows, recent] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("direction", "out")
      .gte("created_at", since),
    supabase
      .from("comment_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", since),
    supabase
      .from("triggers")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("enabled", true),
    supabase
      .from("messages")
      .select("created_at")
      .eq("account_id", accountId)
      .eq("direction", "out")
      .gte("created_at", since),
    supabase
      .from("comment_events")
      .select("created_at")
      .eq("account_id", accountId)
      .gte("created_at", since),
    supabase
      .from("comment_events")
      .select("id, from_username, text, dm_sent, matched_trigger_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // Monta o eixo do gráfico com todos os dias, inclusive os zerados.
  const buckets = new Map<string, ActivityPoint>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
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
    dmsSent: dms.count ?? 0,
    comments: comments.count ?? 0,
    activeTriggers: triggers.count ?? 0,
    chart: [...buckets.values()],
    recent: (recent.data ?? []) as Stats["recent"],
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-[var(--fg-muted)]">
        <Icon size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--fg-dim)]">{hint}</p>
    </div>
  );
}

export default async function OverviewPage() {
  const config = configStatus();
  const account = config.supabase ? await getAccountCached().catch(() => null) : null;

  if (!account) {
    return (
      <>
        <PageHeader title="Visão geral" subtitle="Vamos conectar sua conta primeiro." />
        <div className="p-8">
          <div className="card max-w-xl p-6">
            <h2 className="text-sm font-semibold">Ainda não conectei ao seu Instagram</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              Preencha o <code className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 text-xs">.env.local</code>{" "}
              com o token do Meta e as chaves do Supabase, depois clique em conectar na tela de
              configurações. Lá também tem o diagnóstico do que está faltando.
            </p>
            <Link href="/configuracoes" className="btn btn-primary mt-5">
              Ir para configurações <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </>
    );
  }

  const stats = await loadStats(account.id);

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle={`Conectado como @${account.username ?? account.ig_user_id}`}
        action={
          <Link href="/automacoes" className="btn btn-primary">
            Nova automação
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Contatos" value={stats.contacts} hint="pessoas que já interagiram" />
          <StatCard
            icon={MessagesSquare}
            label="DMs enviadas"
            value={stats.dmsSent}
            hint={`últimos ${DAYS} dias`}
          />
          <StatCard
            icon={MessageCircle}
            label="Comentários capturados"
            value={stats.comments}
            hint={`últimos ${DAYS} dias`}
          />
          <StatCard
            icon={Zap}
            label="Automações ativas"
            value={stats.activeTriggers}
            hint="gatilhos ligados agora"
          />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Atividade dos últimos {DAYS} dias</h2>
          <ActivityChart data={stats.chart} />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-semibold">Comentários recentes</h2>
            <Link href="/automacoes" className="text-xs text-[var(--accent)] hover:underline">
              ver automações
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--fg-dim)]">
              Nada ainda. Assim que alguém comentar num post seu, aparece aqui.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stats.recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">@{c.from_username ?? "desconhecido"}</span>{" "}
                      <span className="text-[var(--fg-muted)]">{c.text}</span>
                    </p>
                  </div>
                  <span
                    className={
                      c.dm_sent ? "chip chip-ok" : c.matched_trigger_id ? "chip chip-danger" : "chip"
                    }
                  >
                    {c.dm_sent ? "DM enviada" : c.matched_trigger_id ? "falhou" : "sem gatilho"}
                  </span>
                  <span className="w-12 text-right text-xs text-[var(--fg-dim)]">
                    {timeAgo(c.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
