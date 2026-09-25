import { Plus } from "lucide-react";
import { Section } from "./Section";

const FAQ = [
  {
    q: "Preciso de conta Business ou Creator?",
    a: "Sim. A conta do Instagram precisa ser profissional (Business ou Creator) para a automação funcionar. A troca é gratuita e feita nas configurações do próprio Instagram.",
  },
  {
    q: "Como eu conecto o meu Instagram?",
    a: "No painel, toque em “Conectar Instagram” e autorize pela tela oficial do Instagram. Você não passa sua senha para a gente.",
  },
  {
    q: "O que conta como mensagem?",
    a: "Só as DMs que a automação envia. O que você responde à mão no Inbox e as respostas públicas nos comentários não contam.",
  },
  {
    q: "Meu Instagram pode ser bloqueado?",
    a: "Sendo honesto: o Instagram limita quantas mensagens uma conta pode mandar por hora, e ninguém consegue garantir que uma conta nunca será restringida. O que a gente faz é usar a API oficial e variar os textos, para diminuir a repetição.",
  },
  {
    q: "E se eu passar do limite do meu plano?",
    a: "As automações pausam até virar o mês ou até você trocar de plano. O painel mostra o seu consumo e avisa quando o limite é atingido.",
  },
  {
    q: "Posso cancelar?",
    a: "Pode, a qualquer momento, pelo portal da assinatura. Não tem fidelidade nem multa.",
  },
  {
    q: "Preciso saber alguma coisa de tecnologia?",
    a: "Não. Se você sabe postar um Reel, sabe montar uma automação.",
  },
];

export function Faq() {
  return (
    <Section id="perguntas" eyebrow="Perguntas" title="Perguntas frequentes">
      <div data-reveal className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="lp-faq card group">
            <summary className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[15px] font-medium sm:px-6 sm:py-5">
              {item.q}
              <Plus size={18} className="lp-faq-icon shrink-0 text-[var(--fg-muted)]" aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-pretty leading-relaxed text-[var(--lp-soft)] sm:px-6">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
