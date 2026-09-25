import { BRAND } from "@/lib/brand";

/**
 * Logo provisório: a inicial da marca num quadrado arredondado com o
 * gradiente. Quando existir o logo definitivo, troque só este componente.
 */
export function BrandMark({ size = 32, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid shrink-0 place-items-center font-bold text-white"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
          fontSize: Math.round(size * 0.46),
          background: "var(--brand)",
          boxShadow: "0 6px 18px -6px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {BRAND.initial}
      </span>
      {withName ? (
        <span className="font-semibold tracking-tight">{BRAND.name}</span>
      ) : (
        <span className="sr-only">{BRAND.name}</span>
      )}
    </span>
  );
}
