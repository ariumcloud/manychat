import { BadgeCheck, Clock, UserCheck, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Kpi, Page, Panel } from "@/components/ui";
import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const revalidate = 60;

const SHOWN = 200;
const DAY_MS = 86_400_000;

type ContactRow = {
  id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_verified: boolean | null;
  last_interaction_at: string | null;
  created_at: string;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

async function loadContacts(accountId: string) {
  const supabase = db();
  const week = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const count = () =>
    supabase.from("mc_contacts").select("id", { count: "exact", head: true }).eq("account_id", accountId);

  const [list, total, followers, fresh, active] = await Promise.all([
    supabase
      .from("mc_contacts")
      .select("*")
      .eq("account_id", accountId)
      .order("last_interaction_at", { ascending: false, nullsFirst: false })
      .limit(SHOWN),
    count(),
    count().eq("is_user_follow_business", true),
    count().gte("created_at", week),
    count().gte("last_interaction_at", week),
  ]);
  return { list, total, followers, fresh, active };
}

export default async function ContatosPage() {
  const account = await getAccountCached().catch(() => null);

  if (!account) {
    return (
      <>
        <PageHeader title="Contatos" />
        <Page>
          <p className="text-sm text-[var(--fg-muted)]">
            Conecte sua conta em Configurações para começar a coletar contatos.
          </p>
        </Page>
      </>
    );
  }

  const { list, total, followers, fresh, active } = await loadContacts(account.id);

  const contacts = (list.data ?? []) as ContactRow[];
  const totalCount = total.count ?? contacts.length;
  const followPct = totalCount ? Math.round(((followers.count ?? 0) / totalCount) * 100) : 0;

  return (
    <>
      <PageHeader title="Contatos" subtitle="Todo mundo que comentou ou mandou DM para você." />

      <Page>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Users} label="Contatos" value={fmt(totalCount)} hint="no total" tone="linear-gradient(135deg,#7c5cff,#5b6bff)" />
          <Kpi
            icon={UserPlus}
            label="Novos"
            value={fmt(fresh.count ?? 0)}
            hint="nos últimos 7 dias"
            tone="linear-gradient(135deg,#f9578e,#a44dff)"
          />
          <Kpi
            icon={Clock}
            label="Ativos"
            value={fmt(active.count ?? 0)}
            hint="interagiram em 7 dias"
            tone="linear-gradient(135deg,#a44dff,#7c5cff)"
          />
          <Kpi
            icon={UserCheck}
            label="Seguem você"
            value={`${followPct}%`}
            hint={`${fmt(followers.count ?? 0)} contatos`}
            tone="linear-gradient(135deg,#34d399,#0ea5e9)"
          />
        </div>

        <Panel
          title="Pessoas"
          subtitle={
            totalCount > contacts.length
              ? `mostrando as ${fmt(contacts.length)} interações mais recentes de ${fmt(totalCount)}`
              : `${fmt(contacts.length)} contato${contacts.length === 1 ? "" : "s"}`
          }
          flush
        >
          {contacts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--fg-dim)]">
              Nenhum contato ainda. Eles entram sozinhos quando alguém comenta ou manda DM.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-y border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--fg-dim)]">
                    <th className="px-4 py-2.5 font-medium">Pessoa</th>
                    <th className="px-4 py-2.5 font-medium">Seguidores</th>
                    <th className="px-4 py-2.5 font-medium">Te segue</th>
                    <th className="px-4 py-2.5 font-medium">Última interação</th>
                    <th className="px-4 py-2.5 font-medium">Entrou</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {contacts.map((c) => (
                    <tr key={c.id} className="row-hover">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.username ?? c.name} src={c.profile_picture_url} size={30} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate font-medium">
                              {c.username ? `@${c.username}` : (c.name ?? "sem nome")}
                              {c.is_verified && <BadgeCheck size={13} className="text-[var(--accent)]" />}
                            </p>
                            {c.name && c.username && (
                              <p className="truncate text-[11px] text-[var(--fg-dim)]">{c.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-[var(--fg-muted)]">
                        {c.follower_count != null ? fmt(c.follower_count) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.is_user_follow_business === null ? (
                          <span className="text-[var(--fg-dim)]">—</span>
                        ) : c.is_user_follow_business ? (
                          <span className="chip chip-ok">sim</span>
                        ) : (
                          <span className="chip">não</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--fg-muted)]">{timeAgo(c.last_interaction_at)}</td>
                      <td className="px-4 py-2.5 text-[var(--fg-muted)]">{timeAgo(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Page>
    </>
  );
}
