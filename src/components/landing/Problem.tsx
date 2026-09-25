import { Check, Clock } from "lucide-react";

const PILE = [
  { handle: "@bia.rocha", answered: true },
  { handle: "@lucas.m", answered: true },
  { handle: "@fe.costa", answered: false },
  { handle: "@rafa.lima", answered: false },
  { handle: "@gabi.alves", answered: false },
  { handle: "@th.oliveira", answered: false },
];

export function Problem() {
  return (
    <section aria-labelledby="problema-titulo" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          data-reveal
          className="lp-glass grid items-center gap-10 overflow-hidden p-6 sm:p-10 md:grid-cols-[1.15fr_1fr] lg:p-14"
          style={{ borderRadius: 28 }}
        >
          <div>
            <p className="lp-eyebrow">O problema</p>
            <h2 id="problema-titulo" className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Você posta um Reel, centenas de pessoas comentam{" "}
              <span className="whitespace-nowrap">“EU QUERO”</span>.{" "}
              <span className="text-[var(--lp-soft)]">Quantas você consegue responder?</span>
            </h2>
            <p className="mt-5 text-pretty leading-relaxed text-[var(--lp-soft)]">
              Uma por uma, no direct, copiando e colando o mesmo link. Enquanto você responde as
              primeiras, as outras esfriam, esquecem o que pediram ou compram de outra pessoa.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-[var(--lp-soft)]">
              Cada pedido sem resposta é alguém que queria o que você oferece e ficou pelo caminho.
              E o tempo que vai no direct sai do próximo conteúdo.
            </p>
          </div>

          {/* A pilha de comentários esperando: ilustração, sem números. */}
          <div aria-hidden className="relative">
            <ul className="space-y-2">
              {PILE.map((c, i) => (
                <li
                  key={c.handle}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5"
                  style={{ opacity: 1 - i * 0.11 }}
                >
                  <span className="min-w-0 truncate text-sm">
                    <span className="font-semibold">{c.handle}</span>{" "}
                    <span className="text-[var(--fg-muted)]">EU QUERO</span>
                  </span>
                  {c.answered ? (
                    <span className="chip chip-ok">
                      <Check size={11} /> respondido
                    </span>
                  ) : (
                    <span className="chip chip-warn">
                      <Clock size={11} /> esperando
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0f18] to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
