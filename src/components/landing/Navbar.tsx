import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const ANCHORS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#perguntas", label: "Perguntas" },
];

export function Navbar({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="lp-nav sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Início" className="rounded-lg">
          <BrandMark withName />
        </Link>

        <nav aria-label="Seções da página" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {ANCHORS.map((a) => (
              <li key={a.href}>
                <a
                  href={a.href}
                  className="rounded-lg px-3 py-2 text-sm text-[var(--fg-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--fg)]"
                >
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-ghost">
              <span className="sm:hidden">Painel</span>
              <span className="hidden sm:inline">Ir para o painel</span>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost">
              Entrar
            </Link>
          )}
          <a href="#planos" className="btn btn-primary">
            Ver planos
          </a>
        </div>
      </div>
    </header>
  );
}
