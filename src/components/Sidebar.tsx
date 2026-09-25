"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clapperboard,
  Contact,
  FlaskConical,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquareShare,
  ShoppingBag,
  Settings,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Onze itens numa lista só viram parede. Em grupos, a pessoa acha o que quer
 * pelo assunto — e o menu passa a caber num relance.
 */
const NAV = [
  {
    group: "Operação",
    items: [
      { href: "/", label: "Visão geral", icon: LayoutDashboard },
      { href: "/automacoes", label: "Automações", icon: MessageSquareShare },
      { href: "/fluxos", label: "Fluxos", icon: Workflow },
      { href: "/inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    group: "Conteúdo",
    items: [
      { href: "/reels", label: "Reels", icon: Clapperboard },
      { href: "/carrossel", label: "Carrosséis", icon: LayoutGrid, adminOnly: true },
      { href: "/catalogo", label: "Catálogo", icon: ShoppingBag },
      { href: "/duvidas", label: "Dúvidas", icon: HelpCircle },
    ],
  },
  {
    group: "Análise",
    items: [
      { href: "/desempenho", label: "Desempenho", icon: TrendingUp },
      { href: "/contatos", label: "Contatos", icon: Contact },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/testes-api", label: "Testes de API", icon: FlaskConical, adminOnly: true },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({
  account,
  isAdmin,
}: {
  account: { username: string | null; profile_picture_url: string | null } | null;
  /** Só o dono vê as ferramentas internas (ver ADMIN_ONLY em proxy.ts). */
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // No editor de fluxo o canvas precisa de toda a largura: o menu vira uma faixa de icones.
  if (/^\/fluxos\/[^/]+/.test(pathname)) {
    return (
      <aside className="flex w-[60px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-4">
        <Link
          href="/"
          title="Fluxo"
          className="grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white"
          style={{ background: "var(--brand)", boxShadow: "0 8px 22px -8px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)" }}
        >
          F
        </Link>

        <nav className="mt-5 flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {NAV.flatMap((g) => g.items)
            .filter((item) => isAdmin || !("adminOnly" in item && item.adminOnly))
            .map(({ href, label, icon: Icon }) => {
              const active = href === "/fluxos";
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition-colors",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--fg-dim)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--fg)]",
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                </Link>
              );
            })}
        </nav>

        <button
          onClick={logout}
          title="Sair"
          aria-label="Sair"
          className="grid h-9 w-9 place-items-center rounded-xl text-[var(--fg-dim)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]"
        >
          <LogOut size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)]">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div
          className="grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white"
          style={{
            background: "var(--brand)",
            boxShadow: "0 8px 22px -8px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          F
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-tight">Fluxo</p>
          <p className="text-[11px] leading-tight text-[var(--fg-dim)]">Instagram no automático</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {NAV.map(({ group, items: all }) => {
          const items = all.filter((item) => isAdmin || !("adminOnly" in item && item.adminOnly));
          if (!items.length) return null;
          return (
          <div key={group} className="mb-4 last:mb-0">
            <p className="nav-group">{group}</p>
            <div className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn("nav-item", active && "nav-item-active")}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={active ? "text-[var(--accent)]" : "text-[var(--fg-dim)]"}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Conta */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[rgba(255,255,255,0.035)]">
          <div className="relative shrink-0">
            {account?.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.profile_picture_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--border-strong)]"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--bg-elev-2)] ring-1 ring-[var(--border)]" />
            )}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-sidebar)]",
                account?.username ? "bg-[var(--success)]" : "bg-[var(--fg-dim)]",
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {account?.username ? `@${account.username}` : "não conectado"}
            </p>
            <p className="text-[10px] text-[var(--fg-dim)]">
              {account?.username ? "conta conectada" : "abra Configurações"}
            </p>
          </div>

          <button
            onClick={logout}
            title="Sair"
            aria-label="Sair"
            className="rounded-lg p-1.5 text-[var(--fg-dim)] opacity-0 transition hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)] focus-visible:opacity-100 group-hover:opacity-100"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
