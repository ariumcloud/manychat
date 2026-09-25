import type { CSSProperties, ReactNode } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Heart,
  MessageCircle,
  Send,
  UserCheck,
} from "lucide-react";

/** Atraso de cada passo da cena, em segundos (só vale sem movimento reduzido). */
const delay = (s: number) => ({ "--lp-delay": `${s}s` }) as CSSProperties;

function Avatar({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: tone }}
    >
      {label}
    </span>
  );
}

const OWN_TONE = "var(--brand)";

function Comment({
  handle,
  text,
  tone,
  initial,
  children,
  highlight = false,
  when,
}: {
  handle: string;
  text: string;
  tone: string;
  initial: string;
  children?: ReactNode;
  highlight?: boolean;
  when: string;
}) {
  return (
    <li className="flex gap-2.5">
      <Avatar label={initial} tone={tone} />
      <div className="min-w-0 flex-1">
        <div
          className={`rounded-xl px-2.5 py-1.5 ${
            highlight ? "lp-pulse bg-[rgba(124,92,255,0.14)] ring-1 ring-[rgba(124,92,255,0.45)]" : ""
          }`}
          style={highlight ? delay(0.9) : undefined}
        >
          <p className="text-[12px] text-[var(--fg-muted)]">
            <span className="font-semibold text-[var(--fg)]">{handle}</span>
            <span className="ml-1.5">{when}</span>
          </p>
          <p className="text-[13px] font-medium text-[var(--fg)]">{text}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

function ReelCard() {
  return (
    <div className="lp-glass w-full max-w-[340px] overflow-hidden md:w-[300px] lg:w-[340px]" style={{ borderRadius: 28 }}>
      {/* O vídeo */}
      <div className="lp-reel-video relative h-[230px]">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3.5 text-[13px] font-semibold text-white">
          <span>Reels</span>
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium">0:24</span>
        </div>
        <p className="absolute inset-x-5 top-16 text-[22px] font-bold leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
          O roteiro que eu uso em todo Reel
        </p>
        <div className="absolute bottom-16 right-3 flex flex-col items-center gap-3.5 text-white/90">
          <Heart size={20} />
          <MessageCircle size={20} />
          <Send size={20} />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-white">
            <Avatar label="S" tone={OWN_TONE} />
            seuperfil
            <span className="rounded-md border border-white/40 px-1.5 py-px text-[11px] font-medium">Seguir</span>
          </p>
          <p className="mt-1.5 text-[12px] leading-snug text-white/90">
            Comenta <strong>EU QUERO</strong> que eu te mando o ebook no direct 📘
          </p>
        </div>
      </div>

      {/* Os comentários */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold">Comentários</p>
          <span className="chip" style={{ fontSize: 11, color: "var(--lp-eyebrow)" }}>
            palavra: EU QUERO
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          <Comment handle="@ana.souza" text="EU QUERO 🙌" tone="#f59e0b" initial="A" when="agora" highlight>
            <div className="lp-seq mt-2 flex gap-2" style={delay(1.3)}>
              <Avatar label="S" tone={OWN_TONE} />
              <div className="rounded-xl bg-white/[0.04] px-2.5 py-1.5">
                <p className="text-[12px] text-[var(--fg-muted)]">
                  <span className="font-semibold text-[var(--fg)]">@seuperfil</span>
                  <span className="ml-1.5 text-[var(--success)]">automático</span>
                </p>
                <p className="text-[13px] text-[var(--fg)]">Te mandei no direct! 📩</p>
              </div>
            </div>
          </Comment>
          <Comment handle="@joao.pedro" text="eu quero!!" tone="#10b981" initial="J" when="1 min" />
          <Comment handle="@carla.mendes" text="EU QUERO 🔥" tone="#3b82f6" initial="C" when="2 min" />
        </ul>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="lp-seq flex shrink-0 items-center gap-3 md:w-32 md:flex-col md:gap-2 lg:w-44" style={delay(1.6)}>
      {/* Vertical no celular, horizontal a partir do md. */}
      <svg viewBox="0 0 24 56" className="h-14 w-6 md:hidden" fill="none" aria-hidden>
        <path d="M12 2 V46" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 6" className="lp-dash" />
        <path d="M5 42 L12 52 L19 42" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="chip" style={{ color: "var(--fg)", borderColor: "rgba(124,92,255,0.45)", background: "rgba(124,92,255,0.14)" }}>
        <Send size={12} /> DM automática
      </span>
      <svg viewBox="0 0 150 24" className="hidden h-6 w-full md:block" fill="none" aria-hidden>
        <path d="M4 12 H136" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 6" className="lp-dash" />
        <path d="M132 5 L144 12 L132 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DmButton({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-1.5 border-t border-white/[0.07] py-2 text-[13px] font-semibold text-[#a99bff]">
      {children}
    </span>
  );
}

function PhoneDM() {
  return (
    <div className="relative w-full max-w-[300px] md:w-[290px] lg:w-[310px] lg:max-w-none">
      <div className="lp-phone">
        <div className="lp-phone-screen">
          {/* Barra de status */}
          <div className="relative flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-white/80">
            <span>20:14</span>
            <span className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              <span className="h-1.5 w-3 rounded-full bg-white/70" />
            </span>
          </div>

          {/* Cabeçalho da conversa */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
            <ChevronLeft size={18} className="text-white/70" />
            <Avatar label="S" tone={OWN_TONE} />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold">seuperfil</p>
              <p className="text-[11px] text-[var(--fg-muted)]">Mensagem para @ana.souza</p>
            </div>
          </div>

          {/* Mensagens */}
          <div className="space-y-2.5 px-3 py-3.5">
            <p className="text-center text-[11px] text-[var(--fg-muted)]">Hoje, 20:14</p>

            <div className="lp-seq flex items-end gap-2" style={delay(1.9)}>
              <Avatar label="S" tone={OWN_TONE} />
              <div className="lp-bubble-in max-w-[82%] overflow-hidden rounded-2xl rounded-bl-md">
                <p className="px-3 py-2 text-[13px] leading-snug">
                  Oi, Ana! 💜 Pra liberar o ebook, me segue aqui rapidinho e toca no botão.
                </p>
                <DmButton>JÁ TE SEGUI</DmButton>
              </div>
            </div>

            <div className="lp-seq flex justify-end" style={delay(2.7)}>
              <p className="lp-bubble-out rounded-2xl rounded-br-md px-3 py-2 text-[13px] font-medium">
                JÁ TE SEGUI
              </p>
            </div>

            <div className="lp-seq flex items-end gap-2" style={delay(3.4)}>
              <Avatar label="S" tone={OWN_TONE} />
              <div className="lp-bubble-in max-w-[82%] overflow-hidden rounded-2xl rounded-bl-md">
                <p className="px-3 py-2 text-[13px] leading-snug">Aqui está o seu ebook 🎁</p>
                <DmButton>
                  Baixar o ebook <ExternalLink size={13} />
                </DmButton>
              </div>
            </div>
          </div>

          {/* Campo de mensagem */}
          <div className="px-3 pb-4">
            <div className="flex items-center justify-between rounded-full border border-white/[0.08] px-4 py-2 text-[12px] text-[var(--fg-muted)]">
              Mensagem…
              <Send size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Selo flutuante: o portão liberou. */}
      <span
        className="lp-seq chip chip-ok absolute -right-28 top-[236px] hidden shadow-lg lg:inline-flex"
        style={{ ...delay(3.0), background: "#0f1f1a" }}
      >
        <UserCheck size={12} /> Seguiu você: liberado
      </span>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div
      role="img"
      aria-label="Exemplo: @ana.souza comenta EU QUERO num Reel, recebe a resposta pública “Te mandei no direct!” e, na DM, um pedido para seguir o perfil com o botão JÁ TE SEGUI. Depois de tocar, chega “Aqui está o seu ebook” com o botão do link."
      className="relative mx-auto max-w-5xl"
    >
      <div aria-hidden className="lp-glow left-[8%] top-[20%] h-64 w-64 bg-[rgba(249,87,142,0.22)]" />
      <div aria-hidden className="lp-glow right-[10%] top-[10%] h-72 w-72 bg-[rgba(124,92,255,0.28)]" />
      <div className="relative flex flex-col items-center md:flex-row md:justify-center">
        <div className="lp-float-slow w-full max-w-[340px] md:w-auto md:max-w-none">
          <ReelCard />
        </div>
        <Connector />
        <div className="lp-float flex w-full justify-center md:w-auto">
          <PhoneDM />
        </div>
      </div>
    </div>
  );
}
