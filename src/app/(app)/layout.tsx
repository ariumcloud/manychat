import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { getAccountCached, type Account } from "@/lib/repo";

/** Abaixo disto o aviso de token aparece em todas as telas. */
const TOKEN_WARN_DAYS = 10;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Se o Supabase ainda nao esta configurado, o painel continua abrindo:
  // a tela de Configuracoes explica o que falta.
  const account = await getAccountCached().catch(() => null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar account={account} />
      <main className="ambient flex-1 overflow-y-auto bg-[var(--bg)]">
        <TokenWarning account={account} />
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
 * nenhum. O cron renova sozinho; isto aparece quando ele nao esta dando conta
 * (ou antes da primeira renovacao, quando a validade ainda e desconhecida).
 */
function TokenWarning({ account }: { account: Account | null }) {
  if (!account) return null;

  const daysLeft = tokenDaysLeft(account.ig_token_expires_at);
  if (daysLeft !== null && daysLeft >= TOKEN_WARN_DAYS) return null;

  const message =
    daysLeft === null
      ? "Validade do token do Instagram desconhecida. Renove uma vez em Configurações para ativar a renovação automática."
      : daysLeft < 0
        ? "O token do Instagram venceu: as automações estão paradas. Gere um token novo."
        : `O token do Instagram vence em ${daysLeft} dia${daysLeft === 1 ? "" : "s"} e a renovação automática não rodou. Renove em Configurações.`;

  return (
    <Link
      href="/configuracoes"
      className={`block px-8 py-2.5 text-sm ${
        daysLeft === null
          ? "bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] text-[var(--warn)]"
          : "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]"
      }`}
    >
      {message}
    </Link>
  );
}
