import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { getAccountCached, type Account } from "@/lib/repo";
import { currentSession } from "@/lib/account-context";
import { getUsage } from "@/lib/billing/usage";
import { decideAccess } from "@/lib/billing/access";

/** Abaixo disto o aviso de token aparece em todas as telas. */
const TOKEN_WARN_DAYS = 10;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Se o Supabase ainda nao esta configurado, o painel continua abrindo:
  // a tela de Configuracoes explica o que falta.
  const account = await getAccountCached().catch(() => null);
  const session = await currentSession();
  // Plano vencido ou limite estourado: avisa em todas as telas, senao o cliente
  // so descobre quando as DMs param de sair.
  const usage = account?.plan ? await getUsage(account.id).catch(() => null) : null;
  const access = account && usage ? decideAccess(account, usage.used) : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar account={account} isAdmin={session?.role === "admin"} />
      <main className="ambient flex-1 overflow-y-auto bg-[var(--bg)]">
        <TokenWarning account={account} />
        {access && !access.allowed && (
          <Link
            href="/configuracoes"
            className="block bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] px-8 py-2.5 text-sm text-[var(--danger)]"
          >
            {access.reason} Ver assinatura.
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}

/** Dias ate o token vencer; null quando a validade ainda nao e conhecida. */
function tokenDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

/**
 * Token vencido = todas as automacoes param, sem erro visivel em lugar
 * nenhum. O cron renova sozinho; isto aparece quando ele nao esta dando conta.
 * Validade desconhecida (conta que ainda nao renovou) nao avisa: era ruido.
 */
function TokenWarning({ account }: { account: Account | null }) {
  if (!account) return null;

  const daysLeft = tokenDaysLeft(account.ig_token_expires_at);
  if (daysLeft === null || daysLeft >= TOKEN_WARN_DAYS) return null;

  const message =
    daysLeft < 0
      ? "O token do Instagram venceu: as automações estão paradas. Gere um token novo."
      : `O token do Instagram vence em ${daysLeft} dia${daysLeft === 1 ? "" : "s"} e a renovação automática não rodou. Renove em Configurações.`;

  return (
    <Link
      href="/configuracoes"
      className="block bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] px-8 py-2.5 text-sm text-[var(--danger)]"
    >
      {message}
    </Link>
  );
}
