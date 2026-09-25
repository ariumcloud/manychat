import type { Metadata } from "next";
import { currentSession } from "@/lib/account-context";
import { BRAND } from "@/lib/brand";
import { Comparison } from "@/components/landing/Comparison";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { Problem } from "@/components/landing/Problem";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { ENTRY_PLAN } from "@/components/landing/pricing-data";
import "@/components/landing/landing.css";

const title = `${BRAND.name}: comentário vira DM no Instagram, no automático`;
const description = `Quando alguém comenta a palavra-chave no seu post ou Reel, o ${BRAND.name} responde no comentário e manda o link, o ebook ou a oferta na DM. Planos a partir de R$ ${ENTRY_PLAN.price} por mês.`;

export const metadata: Metadata = {
  title,
  description,
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: BRAND.name,
    title,
    description,
  },
  twitter: { card: "summary", title, description },
};

export default async function HomePage() {
  // Quem ja esta logado ve "Ir para o painel" no lugar de "Entrar".
  const loggedIn = Boolean(await currentSession());

  return (
    <div className="lp-root min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-[var(--bg-elev-2)] focus:px-4 focus:py-2 focus:text-sm"
      >
        Pular para o conteúdo
      </a>
      <Navbar loggedIn={loggedIn} />
      <main id="conteudo">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <DashboardPreview />
        <Comparison />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <RevealOnScroll />
    </div>
  );
}
