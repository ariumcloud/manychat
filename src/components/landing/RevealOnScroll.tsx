"use client";

import { useEffect } from "react";

/**
 * Entrada suave ao rolar, como melhoria progressiva: o HTML chega visível e só
 * o que ainda está abaixo da dobra ganha .lp-hide, então sem JS (ou com
 * movimento reduzido) nada some e nada pisca no carregamento.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const fold = window.innerHeight * 0.92;
    const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top > fold,
    );
    if (!pending.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("lp-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of pending) {
      el.classList.add("lp-hide");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return null;
}
