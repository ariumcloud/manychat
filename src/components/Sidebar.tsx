"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clapperboard,
  Contact,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquareShare,
  Settings,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/automacoes", label: "Automações", icon: MessageSquareShare },
  { href: "/fluxos", label: "Fluxos", icon: Workflow },
  { href: "/reels", label: "Reels", icon: Clapperboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contatos", label: "Contatos", icon: Contact },
  { href: "/testes-api", label: "Testes de API", icon: FlaskConical },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({
  account,
}: {
  account: { username: string | null; profile_picture_url: string | null } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#f9578e] via-[#a44dff] to-[#5b6bff] text-sm font-bold text-white">
          F
        </div>
        <span className="text-sm font-semibold tracking-tight">Fluxo</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]",
              )}
            >
              <Icon size={16} className={active ? "text-[var(--accent)]" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {account?.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.profile_picture_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-[var(--bg-elev-2)]" />
          )}
          <span className="flex-1 truncate text-xs text-[var(--fg-muted)]">
            {account?.username ? `@${account.username}` : "não conectado"}
          </span>
          <button onClick={logout} title="Sair" className="text-[var(--fg-dim)] hover:text-[var(--fg)]">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
