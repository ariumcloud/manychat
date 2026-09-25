import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function FinalCta() {
  const [first, ...rest] = BRAND.tagline.split(" ");
  return (
    <section aria-labelledby="cta-titulo" className="px-4 py-20 sm:px-6 sm:py-28">
      <div
        data-reveal
        className="lp-glass relative mx-auto max-w-5xl overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-20"
        style={{ borderRadius: 32 }}
      >
        <div aria-hidden className="lp-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 70% at 50% 0%, rgba(124,92,255,0.28), transparent 70%)," +
              "radial-gradient(40% 60% at 90% 100%, rgba(249,87,142,0.16), transparent 70%)",
          }}
        />
        <div className="relative">
          <h2 id="cta-titulo" className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            {first} <span className="lp-gradient-text">{rest.join(" ")}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--lp-soft)] sm:text-lg">
            Deixe a entrega no automático e volte a fazer o que só você faz: criar conteúdo.
          </p>
          <a href="#planos" className="btn btn-primary lp-btn-lg mt-9">
            Escolher meu plano <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
