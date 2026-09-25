import {
  Clock,
  GalleryHorizontal,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  MousePointerClick,
  Tag,
  Zap,
} from "lucide-react";
import type { NodeKind } from "@/lib/flow/types";

/**
 * Identidade de cada tipo de bloco: nome, icone e cor. Vive num lugar so para o
 * canvas, a barra de blocos e o inspetor falarem a mesma lingua — e a cor ser
 * o que deixa o fluxo legivel de relance.
 */
export const KIND_META: Record<
  NodeKind,
  { label: string; hint: string; icon: typeof Zap; color: string }
> = {
  trigger: { label: "Gatilho", hint: "Onde o fluxo começa", icon: Zap, color: "#34d399" },
  text: { label: "Mensagem", hint: "Texto (com variações e link)", icon: MessageSquare, color: "#7c5cff" },
  buttons: { label: "Botões", hint: "Mensagem com botões", icon: MousePointerClick, color: "#f9578e" },
  carousel: { label: "Carrossel", hint: "Cards do catálogo", icon: GalleryHorizontal, color: "#a44dff" },
  image: { label: "Imagem", hint: "Envia uma imagem", icon: ImageIcon, color: "#0ea5e9" },
  delay: { label: "Espera", hint: "Pausa antes do próximo passo", icon: Clock, color: "#fbbf24" },
  tag: { label: "Aplicar tag", hint: "Marca o contato", icon: Tag, color: "#5b6bff" },
  condition: { label: "Condição", hint: "Sim / não (ex.: segue você?)", icon: GitBranch, color: "#fb923c" },
};

/** Cor da aresta pela saida de onde ela sai: sim/nao contam a historia sozinhos. */
export function edgeColor(sourceHandle: string | null | undefined): string {
  if (sourceHandle === "yes") return "#34d399";
  if (sourceHandle === "no") return "#f87171";
  return "#5b6bff";
}
