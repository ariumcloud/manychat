import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageSquareShare, ShieldCheck, Sparkles, Workflow } from "lucide-react";

export const metadata: Metadata = {
  title: "Fluxo — comentário vira DM, no automático",
  description:
    "Automação de Instagram: quando alguém comenta a palavra-chave, a DM sai sozinha. A partir de R$ 39,90 por mês.",
};

/**
 * Para onde vão os botões "Quero assinar". Defina NEXT_PUBLIC_CONTACT_URL com o
 * link do seu WhatsApp (ex.: https://wa.me/55DDDNUMERO?text=Quero%20assinar).
 * Sem ela os botões levam ao login.
 */
const CONTACT_URL = process.env.NEXT_PUBLIC_CONTACT_URL || "/login";

/**
 * Para vender so 3 planos, apague o objeto do plano que sair: a grade se ajusta
 * sozinha. So um plano pode ter `highlight: true`.
 */
const PLANS = [
  {
    name: "Essencial",
    price: "39,90",
    volume: "Até 2.500 mensagens por mês",
    blurb: "Para começar a automatizar o Instagram.",
    highlight: false,
  },
  {
    name: "Pro",
    price: "97",
    volume: "Até 10.000 mensagens por mês",
    blurb: "Para quem vende com Reels e comentários todo dia.",
    highlight: true,
  },
  {
    name: "Ilimitado",
    price: "197",
    volume: "Mensagens ilimitadas (uso justo)",
    blurb: "Para perfis grandes, sem contar mensagem.",
    highlight: false,
  },
];

// Classes escritas por extenso: o Tailwind so gera o que le no codigo.
const PLAN_GRID = PLANS.length <= 3 ? "md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

const INCLUDED = [
  "Automações de comentário → DM por palavra-chave",
  "Portão “me segue”: libera o conteúdo só depois que seguem",
  "Variações de texto, para as DMs não saírem todas iguais",
  "Respostas públicas variadas nos comentários",
  "Construtor visual de fluxos (botões, esperas, carrosséis)",
  "Inbox, contatos e painel de desempenho",
  "Painel próprio, só seu, com login e senha",
];

const STEPS = [
  { title: "Você recebe seu acesso", text: "Login e senha do seu painel, criados na hora." },
  { title: "Conecta o Instagram", text: "Um toque em “Conectar Instagram” e você autoriza a conta." },
  { title: "Escolhe o Reel e a palavra", text: "A partir daí, quem comentar recebe a DM sozinho." },
];

const FAQ = [
  {
    q: "Preciso de conta Business ou Creator?",
    a: "Sim. A conta do Instagram precisa ser profissional (Business ou Creator) para a automação funcionar.",
  },
  {
    q: "O que conta como mensagem?",
    a: "Cada DM que a automação envia para uma pessoa conta como uma mensagem no mês.",
  },
  {
    q: "Meu Instagram corre risco?",
    a: "Você conecta pela autorização oficial do Instagram, sem passar sua senha. O Instagram limita quantas mensagens uma conta manda por hora, e o Fluxo trabalha dentro desses limites.",
  },
];

export default function PlanosPage() {
  return (
    <div className="ambient min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            F
          </div>
          <span className="font-semibold tracking-tight">Fluxo</span>
        </div>
        <Link href="/login" className="btn btn-ghost">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        {/* Hero */}
        <section className="rise pt-10 pb-14 text-center sm:pt-16">
          <span className="chip">
            <Sparkles size={12} /> Automação de Instagram
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Comentou a palavra? A DM sai{" "}
            <span
              style={{
                background: "var(--brand)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              sozinha
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--fg-muted)]">
            Transforme comentários dos seus Reels em conversas e vendas. Você define a palavra-chave,
            o Fluxo responde no comentário e manda o link na DM, 24 horas por dia.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={CONTACT_URL} className="btn btn-primary">
              Quero assinar
            </a>
            <a href="#planos" className="btn btn-ghost">
              Ver planos
            </a>
          </div>
        </section>

        {/* Como funciona */}
        <section className="rise rise-1 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-5">
              <span className="chip">Passo {i + 1}</span>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{step.text}</p>
            </div>
          ))}
        </section>

        {/* Planos */}
        <section id="planos" className="pt-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planos</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              Todos com as mesmas funções. Você só escolhe o volume de mensagens.
            </p>
          </div>

          <div className={`mt-8 grid gap-4 ${PLAN_GRID}`}>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="card relative flex flex-col p-6"
                style={plan.highlight ? { borderColor: "var(--accent)", boxShadow: "var(--shadow-lg)" } : undefined}
              >
                {plan.highlight && (
                  <span className="chip chip-ok absolute -top-3 left-6">Mais escolhido</span>
                )}
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-sm text-[var(--fg-muted)]">R$</span>
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-[var(--fg-muted)]">/mês</span>
                </p>
                <p className="mt-3 text-sm font-medium">{plan.volume}</p>
                <p className="mb-6 mt-1 text-sm text-[var(--fg-muted)]">{plan.blurb}</p>
                <a
                  href={CONTACT_URL}
                  className={`btn mt-auto w-full ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
                >
                  Quero assinar
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* O que está incluso */}
        <section className="grid gap-8 pt-20 md:grid-cols-[1fr_1.2fr] md:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Tudo incluso em todos os planos</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
              Sem plano “básico” com função cortada. A diferença entre eles é só quantas mensagens
              saem por mês.
            </p>
            <div className="mt-5 flex gap-4 text-[var(--fg-dim)]">
              <MessageSquareShare size={18} />
              <Workflow size={18} />
              <ShieldCheck size={18} />
            </div>
          </div>
          <ul className="card space-y-3 p-6">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check size={15} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Perguntas */}
        <section className="pt-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Perguntas rápidas</h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="card p-5">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fechamento */}
        <section className="pt-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Pronto para automatizar?</h2>
          <a href={CONTACT_URL} className="btn btn-primary mt-6">
            Quero assinar
          </a>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--fg-dim)]">
        Fluxo · Instagram no automático
      </footer>
    </div>
  );
}
