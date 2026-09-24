/**
 * Variacoes com que toda automacao nasce. Mandar a mesma frase centenas de
 * vezes por dia e o que o antispam do Instagram mais pega (em 24/09/2026 a
 * conta tomou bloqueio de links em DM, e o suporte da Meta pediu para evitar
 * mensagens repetidas). Tudo editavel depois no painel.
 */

export const DEFAULT_PUBLIC_REPLIES = [
  "Te mandei no direct! 📩",
  "Enviei no seu direct 👀",
  "Chegou aí na sua DM! 📲",
  "Dá uma olhada no seu direct 😉",
  "Mandei lá no privado! 🚀",
  "Já tá no seu direct 🔥",
  "Confere sua DM, te mandei lá 📩",
  "Te chamei no direct! ✌️",
];

/** Texto principal do pedido para seguir (o mesmo que o formulario sugere). */
export const DEFAULT_ASK_FOLLOW_TEXT =
  "Opa! Antes de te mandar, me segue aqui 👉 é rapidinho.\n\nDepois toca no botão abaixo que eu te envio na hora 👇";

export const DEFAULT_ASK_FOLLOW_VARIANTS = [
  "Opa! Pra eu te mandar, me segue aqui rapidinho 👉\n\nDepois é só tocar no botão aqui embaixo que chega na hora 👇",
  "Fala! Antes de liberar, me dá um follow aqui 👉 leva 2 segundos.\n\nAí toca no botão abaixo que eu te mando na hora 👇",
  "Show! Só me segue aqui antes 👉 é rapidinho.\n\nAssim que seguir, toca no botão abaixo que eu te envio 👇",
  "Bora! Me segue aqui primeiro 👉\n\nDepois toca no botão aqui embaixo que o material chega na hora 👇",
  "Quase lá! Me segue aqui 👉 é bem rápido.\n\nFeito isso, toca no botão abaixo que eu te mando 👇",
];

export const DEFAULT_CONTENT_VARIANTS = [
  "Aqui está 👇",
  "Liberado! Acessa aqui 👇",
  "Prontinho, é só abrir 👇",
  "Tá aqui pra você 👇",
  "Na mão! Aproveita 🚀",
];

/** Poucas respostas publicas (0 a 2) sao completadas com as padrao. */
export function withDefaultReplies(texts: string[]): string[] {
  const own = texts.map((t) => t.trim()).filter(Boolean);
  if (own.length >= 3) return own;
  return [...own, ...DEFAULT_PUBLIC_REPLIES.filter((d) => !own.includes(d))];
}

/**
 * Botao do grupo de networking que vai junto do conteudo. Label ate 20
 * caracteres (limite do Instagram).
 */
export const GROUP_BUTTON = {
  kind: "url" as const,
  label: "Grupo de networking",
  url: "https://chat.whatsapp.com/GdXBDckyHHx73enAYmvw9z?mode=gi_t",
};
