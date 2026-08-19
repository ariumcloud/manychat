import { User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ContactRow = {
  id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  subscribed: boolean;
  last_interaction_at: string | null;
  created_at: string;
};

export default async function ContatosPage() {
  const account = await getAccountCached().catch(() => null);

  if (!account) {
    return (
      <>
        <PageHeader title="Contatos" />
        <p className="p-8 text-sm text-[var(--fg-muted)]">
          Conecte sua conta em Configurações para começar a coletar contatos.
        </p>
      </>
    );
  }

  const { data } = await db()
    .from("mc_contacts")
    .select("*")
    .eq("account_id", account.id)
    .order("last_interaction_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const contacts = (data ?? []) as ContactRow[];

  return (
    <>
      <PageHeader
        title="Contatos"
        subtitle={`${contacts.length} pessoa${contacts.length === 1 ? "" : "s"} que já interagiram com você.`}
      />

      <div className="p-8">
        {contacts.length === 0 ? (
          <p className="text-sm text-[var(--fg-dim)]">
            Nenhum contato ainda. Eles entram sozinhos quando alguém comenta ou manda DM.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--fg-muted)]">
                  <th className="px-5 py-3 font-medium">Pessoa</th>
                  <th className="px-5 py-3 font-medium">Seguidores</th>
                  <th className="px-5 py-3 font-medium">Te segue</th>
                  <th className="px-5 py-3 font-medium">Última interação</th>
                  <th className="px-5 py-3 font-medium">Entrou</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-elev)]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {c.profile_picture_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.profile_picture_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--bg-elev-2)] text-[var(--fg-dim)]">
                            <User size={13} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {c.username ? `@${c.username}` : (c.name ?? "sem nome")}
                          </p>
                          <p className="truncate font-mono text-[11px] text-[var(--fg-dim)]">
                            {c.igsid}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--fg-muted)]">
                      {c.follower_count ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.is_user_follow_business === null ? (
                        <span className="text-[var(--fg-dim)]">—</span>
                      ) : c.is_user_follow_business ? (
                        <span className="chip chip-ok">sim</span>
                      ) : (
                        <span className="chip">não</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-muted)]">
                      {timeAgo(c.last_interaction_at)}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-muted)]">{timeAgo(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
