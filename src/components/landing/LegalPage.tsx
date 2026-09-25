import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/landing/Footer";

export const CONTACT_WHATSAPP = "(49) 99931-7620";
export const CONTACT_WHATSAPP_URL = "https://wa.me/5549999317620";
export const LEGAL_UPDATED = "25 de setembro de 2026";

/** Casca das páginas legais (privacidade, termos, exclusão de dados). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Voltar para a página inicial">
            <BrandMark withName />
          </Link>
          <Link href="/login" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--fg-dim)]">Última atualização: {LEGAL_UPDATED}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)] [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--fg)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--fg)]">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
