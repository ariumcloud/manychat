import type { FlowEdge, FlowNode } from "@/lib/flow/types";

export type Issue = { nodeId: string; message: string };

/**
 * Problemas que fariam o fluxo falhar ou ficar estranho na conversa. Nao barra
 * o salvamento: e um aviso, mostrado no resumo e nos blocos.
 */
export function validateFlow(nodes: FlowNode[], edges: Pick<FlowEdge, "source" | "target" | "sourceHandle">[]): Issue[] {
  const issues: Issue[] = [];
  const incoming = new Set(edges.map((e) => e.target));
  const outgoing = (id: string, handle?: string) =>
    edges.some((e) => e.source === id && (handle === undefined || e.sourceHandle === handle));

  for (const n of nodes) {
    const d = n.data;
    const add = (message: string) => issues.push({ nodeId: n.id, message });

    if (n.type === "trigger") {
      if (!outgoing(n.id)) add("O gatilho não está ligado a nenhum bloco.");
      continue;
    }
    if (!incoming.has(n.id)) add("Bloco solto: nada leva até ele.");

    switch (n.type) {
      case "text":
        if (!d.text?.trim()) add("Mensagem vazia.");
        break;
      case "buttons":
        if (!d.text?.trim()) add("Escreva o texto acima dos botões.");
        if (!(d.buttons ?? []).length) add("Adicione pelo menos um botão.");
        for (const b of d.buttons ?? []) {
          if (!b.label?.trim()) add("Há um botão sem rótulo.");
          else if (b.kind !== "reply" && !("url" in b && b.url?.trim())) add(`O botão "${b.label}" não tem link.`);
        }
        break;
      case "image":
        if (!d.url?.trim()) add("Imagem sem URL.");
        break;
      case "tag":
        if (!d.tagName?.trim()) add("Tag sem nome.");
        break;
      case "carousel":
        if (!(d.items ?? []).length) add("Carrossel sem cards.");
        break;
      case "condition":
        if (!outgoing(n.id, "yes")) add("A saída “Sim” não leva a lugar nenhum.");
        if (!outgoing(n.id, "no")) add("A saída “Não” não leva a lugar nenhum.");
        break;
    }
  }
  return issues;
}
