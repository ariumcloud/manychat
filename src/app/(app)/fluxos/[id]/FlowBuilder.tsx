"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  GitBranch,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { nodeTypes } from "@/components/flow/nodes";
import { Inspector } from "@/components/flow/Inspector";
import type { Flow, FlowNode, FlowNodeData, NodeKind } from "@/lib/flow/types";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetchJson";

const PALETTE: Array<{ kind: NodeKind; label: string; icon: typeof MessageSquare; data: FlowNodeData }> = [
  { kind: "text", label: "Mensagem", icon: MessageSquare, data: { text: "Escreva aqui…" } },
  { kind: "buttons", label: "Botões", icon: MousePointerClick, data: { text: "Escolha:", buttons: [] } },
  { kind: "quickReplies", label: "Respostas rápidas", icon: ListChecks, data: { text: "Escolha:", options: [] } },
  { kind: "image", label: "Imagem", icon: ImageIcon, data: { url: "" } },
  { kind: "delay", label: "Espera", icon: Clock, data: { seconds: 2 } },
  { kind: "tag", label: "Aplicar tag", icon: Tag, data: { tagName: "" } },
  { kind: "condition", label: "Condição", icon: GitBranch, data: { field: "is_user_follow_business" } },
];

const edgeDefaults = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#333a4d" },
};

export function FlowBuilder({ flow }: { flow: Flow }) {
  return (
    <ReactFlowProvider>
      <Canvas flow={flow} />
    </ReactFlowProvider>
  );
}

function Canvas({ flow }: { flow: Flow }) {
  const router = useRouter();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    (flow.nodes ?? []).map((n) => ({ ...n, type: n.type })) as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    (flow.edges ?? []).map((e) => ({ ...e, ...edgeDefaults })) as Edge[],
  );

  const [name, setName] = useState(flow.name);
  const [status, setStatus] = useState(flow.status);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Contador em vez de Date.now(): ids estáveis e sem impureza no render.
  const nodeSeq = useRef((flow.nodes ?? []).length);

  const selected = useMemo(
    () => (nodes.find((n) => n.id === selectedId) as FlowNode | undefined) ?? null,
    [nodes, selectedId],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...edgeDefaults }, eds)),
    [setEdges],
  );

  function addNode(kind: NodeKind, data: FlowNodeData) {
    const id = `${kind}-${++nodeSeq.current}`;
    const last = nodes[nodes.length - 1];
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: kind,
        position: {
          x: (last?.position.x ?? 100) + 300,
          y: (last?.position.y ?? 150) + (nodeSeq.current % 3) * 40,
        },
        data: { ...data },
      } as Node,
    ]);
    setSelectedId(id);
  }

  function patchSelected(patch: Partial<FlowNodeData>) {
    if (!selectedId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }

  async function save(nextStatus = status) {
    setSaving(true);
    setError(null);

    const { ok, error: err } = await fetchJson(`/api/flows/${flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        status: nextStatus,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
        })),
      }),
    });

    if (ok) {
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      setError(null);
      router.refresh();
    } else {
      setError(err ?? "Não consegui salvar.");
    }
    setSaving(false);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
        <Link href="/fluxos" className="text-[var(--fg-dim)] hover:text-[var(--fg)]">
          <ArrowLeft size={17} />
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64 rounded-lg bg-transparent px-2 py-1 text-sm font-medium outline-none focus:bg-[var(--bg-elev-2)]"
        />

        <span
          className={cn(
            "chip",
            status === "live" ? "chip-ok" : status === "paused" ? "chip-warn" : "",
          )}
        >
          {status === "live" ? "no ar" : status === "paused" ? "pausado" : "rascunho"}
        </span>

        {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
        {savedAt && !error && (
          <span className="flex items-center gap-1 text-xs text-[var(--fg-dim)]">
            <Check size={12} /> salvo {savedAt}
          </span>
        )}

        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost" onClick={() => save()} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Salvar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => save(status === "live" ? "paused" : "live")}
            disabled={saving}
          >
            {status === "live" ? "Pausar" : "Publicar"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 space-y-1 border-r border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--fg-dim)]">
            Blocos
          </p>
          {PALETTE.map(({ kind, label, icon: Icon, data }) => (
            <button
              key={kind}
              onClick={() => addNode(kind, data)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]"
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#242938" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <Inspector node={selected} onChange={patchSelected} onDelete={deleteSelected} />
      </div>
    </div>
  );
}
