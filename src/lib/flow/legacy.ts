import type { FlowNode } from "./types";

type LegacyQuickRepliesNode = {
  id: string;
  type: "quickReplies";
  position: FlowNode["position"];
  data: FlowNode["data"] & { options?: Array<{ label: string; payload: string }> };
};

/**
 * Fluxos salvos antes da troca para botao fixo ainda guardam nos
 * "quickReplies". Eles viram "buttons" com as mesmas opcoes e o mesmo payload,
 * entao o clique continua caindo no mesmo ponto do fluxo. O Instagram aceita
 * no maximo 3 botoes por card; o que passar disso fica de fora.
 */
export function upgradeLegacyNodes<T extends { nodes?: unknown }>(flow: T): T {
  if (!Array.isArray(flow.nodes)) return flow;
  const nodes = (flow.nodes as Array<FlowNode | LegacyQuickRepliesNode>).map((n): FlowNode => {
    if (n.type !== "quickReplies") return n;
    const { options, ...data } = n.data;
    return {
      ...n,
      type: "buttons",
      data: {
        ...data,
        buttons: (options ?? [])
          .slice(0, 3)
          .map((o) => ({ kind: "reply" as const, label: o.label, payload: o.payload })),
      },
    };
  });
  return { ...flow, nodes };
}
