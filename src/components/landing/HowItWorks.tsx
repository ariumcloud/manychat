import type { CSSProperties, ReactNode } from "react";
import { Check, CheckCheck, Link2, ShieldCheck } from "lucide-react";
import { Section } from "./Section";

/* Mini ilustrações de cada passo, em HTML puro. */

function ConnectArt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <span className="btn btn-primary pointer-events-none">
        <Link2 size={15} /> Conectar Instagram
      </span>
      <span className="chip chip-ok">
        <ShieldCheck size={11} /> Autorização oficial · sem senha
      </span>
    </div>
  );
}

function PickArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-2">
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`relative h-[68px] rounded-lg ${i === 1 ? "ring-2 ring-[var(--accent)]" : "opacity-60"}`}
            style={{
              background:
                i === 1
                  ? "linear-gradient(160deg, #f9578e, #7c5cff)"
                  : i === 0
                    ? "linear-gradient(160deg, #2b3350, #1a1f30)"
                    : "linear-gradient(160deg, #3a2b50, #1d1a30)",
            }}
          >
            {i === 1 && (
              <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[var(--accent)]">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-[13px]">
        <span className="text-[var(--fg-muted)]">Palavra-chave: </span>
        <span className="font-semibold">EU QUERO</span>
      </div>
    </div>
  );
}

function SendArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-2">
      <p className="lp-bubble-in max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-[13px]">
        Aqui está o seu link 👇
      </p>
      <p className="lp-bubble-in max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-[13px] font-semibold text-[#a99bff]">
        Abrir o conteúdo
      </p>
      <p className="flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
        <CheckCheck size={13} className="text-[var(--success)]" /> Enviada sozinha, sem você tocar no celular
      </p>
    </div>
  );
}

const STEPS: { title: string; text: string; art: ReactNode }[] = [
  {
    title: "Conecte o Instagram",
    text: "Um botão no painel e a autorização oficial do Instagram. Você não passa sua senha para ninguém.",
    art: <ConnectArt />,
  },
  {
    title: "Escolha o Reel e a palavra",
    text: "Um post específico ou qualquer post. Diga qual palavra dispara a automação e o que a pessoa recebe.",
    art: <PickArt />,
  },
  {
    title: "A DM sai sozinha",
    text: "Quem comentar ganha a resposta no comentário e o conteúdo no direct. Em segundos, até de madrugada.",
    art: <SendArt />,
  },
];

export function HowItWorks() {
  return (
    <Section
      id="como-funciona"
      eyebrow="Como funciona"
      title="Três passos e está no ar"
      lead="Sem planilha, sem código, sem ficar de olho no celular."
    >
      <ol className="relative mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            data-reveal
            style={{ "--lp-delay": `${i * 0.1}s` } as CSSProperties}
            className="card lp-lift flex flex-col p-5 sm:p-6"
          >
            <div aria-hidden className="h-44 rounded-xl border border-white/[0.05] bg-[radial-gradient(80%_80%_at_50%_0%,rgba(124,92,255,0.12),transparent)] p-4">
              {step.art}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
            </div>
            <p className="mt-3 text-pretty text-[15px] leading-relaxed text-[var(--lp-soft)]">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
