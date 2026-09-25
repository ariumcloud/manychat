import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative isolate pb-16 pt-14 sm:pb-24 sm:pt-20">
      {/* Fundo: grid que some para baixo + brilhos da marca. */}
      <div aria-hidden className="lp-grid absolute inset-x-0 top-0 -z-10 h-[680px]" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[620px]"
        style={{
          background:
            "radial-gradient(45% 55% at 50% 0%, rgba(124,92,255,0.22), transparent 70%)," +
            "radial-gradient(30% 40% at 85% 10%, rgba(249,87,142,0.12), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rise mx-auto max-w-3xl text-center">
          <span className="chip" style={{ color: "var(--fg)", background: "rgba(255,255,255,0.04)" }}>
            <Sparkles size={12} className="text-[var(--lp-eyebrow)]" />
            Para criadores e pequenos negócios no Instagram
          </span>
          <h1
            id="hero-titulo"
            className="mt-6 text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Cada <span className="whitespace-nowrap">“EU QUERO”</span> vira uma DM <span className="lp-gradient-text">em segundos</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--lp-soft)] sm:text-lg">
            Alguém comentou a palavra-chave no seu post ou Reel? O {BRAND.name} responde no
            comentário e manda o link, o ebook ou a oferta no direct. Sozinho, sem você digitar
            nada.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a href="#planos" className="btn btn-primary lp-btn-lg">
              Ver planos <ArrowRight size={16} />
            </a>
            <a href="#como-funciona" className="btn btn-ghost lp-btn-lg">
              Como funciona
            </a>
          </div>
        </div>

        <div className="mt-16 sm:mt-20">
          <HeroMockup />
        </div>

        <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--lp-soft)]">
          <li className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--success)]" /> Conexão oficial do Instagram
          </li>
          <li aria-hidden className="hidden text-[var(--fg-dim)] sm:block">
            ·
          </li>
          <li className="flex items-center gap-2">
            <Lock size={15} className="text-[var(--success)]" /> Sem passar senha
          </li>
        </ul>
      </div>
    </section>
  );
}
