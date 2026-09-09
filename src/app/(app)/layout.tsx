import { Sidebar } from "@/components/Sidebar";
import { getAccountCached } from "@/lib/repo";


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Se o Supabase ainda nao esta configurado, o painel continua abrindo:
  // a tela de Configuracoes explica o que falta.
  const account = await getAccountCached().catch(() => null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar account={account} />
      <main className="ambient flex-1 overflow-y-auto bg-[var(--bg)]">{children}</main>
    </div>
  );
}
