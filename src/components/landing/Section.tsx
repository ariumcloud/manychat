import type { ReactNode } from "react";

/** Seção com título ligado por aria-labelledby e espaço para a âncora da navbar. */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className = "",
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={titleId} className={`scroll-mt-20 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header data-reveal className="mx-auto max-w-2xl text-center">
          <p className="lp-eyebrow">{eyebrow}</p>
          <h2
            id={titleId}
            className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {title}
          </h2>
          {lead && (
            <p className="mt-4 text-pretty text-base leading-relaxed text-[var(--lp-soft)] sm:text-lg">
              {lead}
            </p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
