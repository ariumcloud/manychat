import type { CSSProperties } from "react";
import {
  ChartColumn,
  GalleryHorizontal,
  Inbox,
  KeyRound,
  Lock,
  Magnet,
  MessageSquareShare,
  MessagesSquare,
  Reply,
  Shuffle,
  UserCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FlowDiagram } from "./FlowDiagram";
import { Section } from "./Section";

type Item = { icon: LucideIcon; title: string; text: string };

const GROUPS: { name: string; icon: LucideIcon; lead: string; items: Item[] }[] = [
  {
    name: "Captar",
    icon: Magnet,
    lead: "Ninguém que comentou fica sem resposta.",
    items: [
      {
        icon: MessageSquareShare,
        title: "Comentário vira DM",
        text: "Por palavra-chave, num post específico ou em qualquer post do perfil.",
      },
      {
        icon: Reply,
        title: "Resposta pública automática",
        text: "Responde no próprio comentário, com textos que variam.",
      },
      {
        icon: UserCheck,
        title: "Portão “me segue”",
        text: "Entrega o conteúdo só para quem segue você.",
      },
    ],
  },
  {
    name: "Conversar",
    icon: MessagesSquare,
    lead: "A DM leva a pessoa até onde você quer.",
    items: [
      {
        icon: Workflow,
        title: "Fluxos visuais",
        text: "Mensagens, botões, esperas e condições de sim ou não, sem código.",
      },
      {
        icon: GalleryHorizontal,
        title: "Carrossel de produtos",
        text: "Vários produtos numa mensagem só, cada um com o seu botão.",
      },
      {
        icon: Inbox,
        title: "Inbox",
        text: "Assuma a conversa quando quiser responder você mesmo.",
      },
    ],
  },
  {
    name: "Medir",
    icon: ChartColumn,
    lead: "Saiba o que funciona e onde as pessoas param.",
    items: [
      {
        icon: ChartColumn,
        title: "Funil de desempenho",
        text: "Comentou, recebeu a DM, abriu, clicou: tudo num painel.",
      },
      {
        icon: Users,
        title: "Contatos e tags",
        text: "Quem interagiu, separado pelas tags que o fluxo aplicou.",
      },
      {
        icon: KeyRound,
        title: "Painel só seu",
        text: "Cada cliente entra no próprio painel, com login e senha.",
      },
    ],
  },
];

const BLOCKS = ["Mensagem", "Botões", "Espera", "Condição sim/não", "Tag", "Carrossel"];

const VARIATIONS = [
  "Aqui está o seu link 👇",
  "Prontinho! Segue o material 💜",
  "Chegou! É só tocar no botão 👇",
];

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[rgba(124,92,255,0.3)] bg-[rgba(124,92,255,0.12)] text-[#b9a6ff]">
      <Icon size={17} />
    </span>
  );
}

export function Features() {
  return (
    <Section
      id="recursos"
      eyebrow="Recursos"
      title="Tudo para responder todo mundo, do comentário ao clique"
      lead="Captar quem comenta, conversar no direct e medir o resultado. Tudo incluso em todos os planos."
    >
      {/* Os dois destaques */}
      <div className="mt-14 grid gap-5 lg:grid-cols-12">
        <article data-reveal className="lp-glass lp-lift flex flex-col p-6 sm:p-8 lg:col-span-7">
          <div className="flex items-center gap-3">
            <IconBadge icon={Workflow} />
            <p className="lp-eyebrow">Construtor de fluxos</p>
          </div>
          <h3 className="mt-4 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            Monte a conversa como um desenho, bloco por bloco
          </h3>
          <p className="mt-3 max-w-xl text-pretty leading-relaxed text-[var(--lp-soft)]">
            Decida o que acontece depois do comentário: pergunta se a pessoa segue, espera um
            pouco, mostra produtos, marca com uma tag. Você vê o caminho inteiro na tela.
          </p>
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[var(--bg)]/60 p-4 sm:p-6">
            <FlowDiagram />
          </div>
          <ul aria-label="Blocos disponíveis" className="mt-5 flex flex-wrap gap-2">
            {BLOCKS.map((b) => (
              <li key={b} className="chip">
                {b}
              </li>
            ))}
          </ul>
        </article>

        <article
          data-reveal
          style={{ "--lp-delay": "0.1s" } as CSSProperties}
          className="lp-glass lp-lift flex flex-col p-6 sm:p-8 lg:col-span-5"
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={UserCheck} />
            <p className="lp-eyebrow">Portão e variações</p>
          </div>
          <h3 className="mt-4 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            Ganhe seguidor em cada entrega. E nada de mensagem repetida.
          </h3>
          <p className="mt-3 text-pretty leading-relaxed text-[var(--lp-soft)]">
            O conteúdo só sai para quem segue o perfil. E cada DM usa um texto diferente, para as
            mensagens não saírem todas iguais.
          </p>

          <div aria-hidden className="mt-8 grid flex-1 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg)]/60 p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
                <Lock size={12} /> Portão “me segue”
              </p>
              <div className="lp-bubble-in mt-3 max-w-[260px] overflow-hidden rounded-2xl rounded-bl-md">
                <p className="px-3 py-2 text-[13px]">Me segue aqui pra eu liberar o seu material 💜</p>
                <p className="border-t border-white/[0.07] py-2 text-center text-[13px] font-semibold text-[#a99bff]">
                  JÁ TE SEGUI
                </p>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--success)]">
                <UserCheck size={13} /> Seguiu? O conteúdo é liberado.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg)]/60 p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
                <Shuffle size={12} /> Variações da mesma mensagem
              </p>
              <ul className="mt-3 space-y-2">
                {VARIATIONS.map((v, i) => (
                  <li key={v} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-[11px] font-semibold text-[var(--lp-eyebrow)]">
                      V{i + 1}
                    </span>
                    <span className="lp-bubble-in rounded-2xl rounded-bl-md px-3 py-1.5 text-[13px]">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </div>

      {/* Os três grupos */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {GROUPS.map((group, gi) => (
          <article
            key={group.name}
            data-reveal
            style={{ "--lp-delay": `${gi * 0.08}s` } as CSSProperties}
            className="card lp-lift p-6"
          >
            <header className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: "var(--brand)" }}>
                <group.icon size={17} aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{group.name}</h3>
                <p className="text-sm text-[var(--fg-muted)]">{group.lead}</p>
              </div>
            </header>
            <ul className="mt-6 space-y-5">
              {group.items.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <IconBadge icon={item.icon} />
                  <div>
                    <h4 className="text-[15px] font-semibold">{item.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--lp-soft)]">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
