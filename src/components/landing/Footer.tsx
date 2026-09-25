import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandMark withName />
          <p className="mt-3 text-sm text-[var(--fg-muted)]">{BRAND.short}</p>
        </div>

        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/login" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Entrar
              </Link>
            </li>
            <li>
              <a href="#planos" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Planos
              </a>
            </li>
            <li>
              <a href="#perguntas" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Perguntas
              </a>
            </li>
            <li>
              <Link href="/termos" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href="/exclusao-de-dados" className="text-[var(--lp-soft)] hover:text-[var(--fg)]">
                Exclusão de dados
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/[0.04]">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-[var(--fg-muted)] sm:px-6">
          © {new Date().getFullYear()} {BRAND.name}. Não somos afiliados ao Instagram nem à Meta.
          Instagram é marca da Meta.
        </p>
      </div>
    </footer>
  );
}
