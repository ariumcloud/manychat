"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, Loader2 } from "lucide-react";
import { nodeTypes } from "@/components/flow/nodes";
import { Inspector } from "@/components/flow/Inspector";
import { FlowSummary } from "@/components/flow/FlowSummary";
import { CatalogContext, type CatalogState } from "@/components/flow/catalog-context";
import { KIND_META, edgeColor } from "@/components/flow/meta";
import { validateFlow } from "@/components/flow/validate";
import { cardHandle, type CatalogItem } from "@/lib/catalog";
import type { Flow, FlowNode, FlowNodeData, NodeKind } from "@/lib/flow/types";
import { fetchJson } from "@/lib/fetchJson";

/** Blocos que o usuario pode adicionar (o gatilho ja vem no fluxo). */
const PALETTE: Array<{ kind: NodeKind; data: FlowNodeData }> = [
  { kind: "text", data: { text: "Escreva aqui…" } },
  { kind: "buttons", data: { text: "Escolha:", buttons: [] } },
  { kind: "carousel", data: { items: [] } },
  { kind: "image", data: { url: "" } },
  { kind: "delay", data: { seconds: 2 } },
  { kind: "tag", data: { tagName: "" } },
  { kind: "condition", data: { field: "is_user_follow_business" } },
];

const DRAG_MIME = "application/x-flow-kind";

/** Seta com a cor da saida de onde sai; sim/nao ganham rotulo. */
function styleEdge<E extends Partial<Edge>>(edge: E): E {
  const color = edgeColor(edge.sourceHandle);
  return {
    ...edge,
    animated: false,
    style: { stroke: color, strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    label: edge.sourceHandle === "yes" ? "sim" : edge.sourceHandle === "no" ? "não" : undefined,
    labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: "#0f111a", fillOpacity: 0.95 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
  };
}

/** Snapshot estavel para saber se ha alteracao nao salva. */
const snapshotOf = (name: string, nodes: Node[], edges: Edge[]) =>
  JSON.stringify({
    name,
    nodes: nodes.map((n) => [n.id, n.type, Math.round(n.position.x), Math.round(n.position.y), n.data]),
    edges: edges.map((e) => [e.source, e.sourceHandle ?? null, e.target]),
  });

export function FlowBuilder({ flow }: { flow: Flow }) {
  return (
    <ReactFlowProvider>
      <Canvas flow={flow} />
    </ReactFlowProvider>
  );
}

function Canvas({ flow }: { flow: Flow }) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);

  const initialNodes = useMemo(() => (flow.nodes ?? []).map((n) => ({ ...n, type: n.type })) as Node[], [flow.nodes]);
  const initialEdges = useMemo(() => (flow.edges ?? []).map((e) => styleEdge(e as Edge)) as Edge[], [flow.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const [name, setName] = useState(flow.name);
  const [status, setStatus] = useState(flow.status);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => snapshotOf(flow.name, initialNodes, initialEdges));
  // Contador em vez de Date.now(): ids estáveis e sem impureza no render.
  const nodeSeq = useRef((flow.nodes ?? []).length);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchJson<{ items: CatalogItem[] }>("/api/catalog").then(({ ok, data, error: err }) => {
      if (!alive) return;
      if (ok) setCatalogItems(data?.items ?? []);
      else setCatalogError(err ?? "Não consegui carregar o catálogo.");
      setCatalogLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const catalog = useMemo<CatalogState>(
    () => ({
      items: catalogItems,
      byId: new Map(catalogItems.map((i) => [i.id, i])),
      loading: catalogLoading,
      error: catalogError,
    }),
    [catalogItems, catalogLoading, catalogError],
  );

  const selected = useMemo(
    () => (nodes.find((n) => n.id === selectedId) as FlowNode | undefined) ?? null,
    [nodes, selectedId],
  );

  const issues = useMemo(() => validateFlow(nodes as unknown as FlowNode[], edges), [nodes, edges]);
  const dirty = snapshotOf(name, nodes, edges) !== saved;

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(styleEdge({ ...connection }), eds)),
    [setEdges],
  );

  /**
   * Adiciona um bloco. Com um bloco selecionado, o novo entra logo depois dele
   * e ja vem ligado (menos apos condicao/carrossel, que tem varias saidas e
   * pedem que voce escolha de onde ligar).
   */
  function addNode(kind: NodeKind, data: FlowNodeData, at?: { x: number; y: number }) {
    const id = `${kind}-${++nodeSeq.current}`;
    const from = !at && selected ? selected : null;

    let position = at;
    if (!position) {
      if (from) {
        position = { x: from.position.x + 320, y: from.position.y };
        // Evita empilhar em cima de um bloco que ja esta ali.
        while (nodes.some((n) => Math.abs(n.position.x - position!.x) < 200 && Math.abs(n.position.y - position!.y) < 90)) {
          position = { x: position.x, y: position.y + 130 };
        }
      } else {
        const box = wrapRef.current?.getBoundingClientRect();
        position = box
          ? screenToFlowPosition({ x: box.left + box.width / 2 - 110, y: box.top + box.height / 2 - 60 })
          : { x: 100, y: 150 };
      }
    }

    setNodes((prev) => [...prev, { id, type: kind, position, data: { ...data } } as Node]);

    const multiOutput = from?.type === "condition" || from?.type === "carousel";
    if (from && !multiOutput && !edges.some((e) => e.source === from.id && !e.sourceHandle)) {
      setEdges((prev) => addEdge(styleEdge({ id: `e-${from.id}-${id}`, source: from.id, target: id }), prev));
    }
    setSelectedId(id);
  }

  function patchSelected(patch: Partial<FlowNodeData>) {
    if (!selectedId) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)));
    // Card tirado do carrossel leva junto a aresta da saida dele.
    if (patch.items) {
      const kept = new Set(patch.items.map(cardHandle));
      setEdges((prev) =>
        prev.filter((e) => e.source !== selectedId || !e.sourceHandle?.startsWith("card-") || kept.has(e.sourceHandle)),
      );
    }
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }

  const save = useCallback(
    async (nextStatus = status) => {
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
        setSaved(snapshotOf(name, nodes, edges));
        setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        setError(null);
        router.refresh();
      } else {
        setError(err ?? "Não consegui salvar.");
      }
      setSaving(false);
    },
    [status, name, nodes, edges, flow.id, router],
  );

  // Cmd/Ctrl+S salva sem sair do canvas.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Sair com alteracao pendente: o navegador pergunta antes de perder o trabalho.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const statusChip =
    status === "live" ? { text: "no ar", cls: "chip chip-ok" } : status === "paused" ? { text: "pausado", cls: "chip chip-warn" } : { text: "rascunho", cls: "chip" };

  return (
    <CatalogContext.Provider value={catalog}>
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/dashboard/fluxos" className="text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
              Fluxos
            </Link>
            <ChevronRight size={14} className="shrink-0 text-[var(--fg-dim)]" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nome do fluxo"
              className="w-64 min-w-0 rounded-md bg-transparent px-2 py-1 font-semibold outline-none transition-colors hover:bg-[var(--bg-elev-2)] focus:bg-[var(--bg-elev-2)]"
            />
          </nav>

          <span className={statusChip.cls}>{statusChip.text}</span>

          {error ? (
            <span className="text-xs text-[var(--danger)]">{error}</span>
          ) : dirty ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--warn)]">
              <i className="dot" style={{ background: "var(--warn)", boxShadow: "none" }} /> alterações não salvas
            </span>
          ) : savedAt ? (
            <span className="flex items-center gap-1 text-xs text-[var(--fg-dim)]">
              <Check size={12} /> salvo às {savedAt}
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {issues.length > 0 && (
              <button
                onClick={() => setSelectedId(null)}
                title="Ver pontos de atenção"
                className="chip chip-warn cursor-pointer"
              >
                <AlertTriangle size={11} /> {issues.length}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => save()} disabled={saving || !dirty}>
              {saving && <Loader2 size={14} className="animate-spin" />} Salvar
              <kbd className="ml-1 hidden rounded border border-[var(--border-strong)] px-1 text-[10px] text-[var(--fg-dim)] sm:inline">⌘S</kbd>
            </button>
            <button className="btn btn-primary" onClick={() => save(status === "live" ? "paused" : "live")} disabled={saving}>
              {status === "live" ? "Pausar" : "Publicar"}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div
            ref={wrapRef}
            className="relative min-w-0 flex-1"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_MIME)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(e) => {
              const kind = e.dataTransfer.getData(DRAG_MIME) as NodeKind;
              const item = PALETTE.find((p) => p.kind === kind);
              if (!item) return;
              e.preventDefault();
              addNode(item.kind, item.data, screenToFlowPosition({ x: e.clientX - 110, y: e.clientY - 30 }));
            }}
          >
            {/* Barra de blocos: flutua sobre o canvas em vez de roubar uma coluna inteira. */}
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elev)]/95 p-1.5 shadow-lg backdrop-blur">
              <span className="hidden whitespace-nowrap px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--fg-dim)] lg:block">
                Adicionar
              </span>
              {PALETTE.map(({ kind, data }) => {
                const { label, hint, icon: Icon, color } = KIND_META[kind];
                return (
                  <button
                    key={kind}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, kind);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addNode(kind, data)}
                    title={`${label} — ${hint}. Clique ou arraste para o canvas.`}
                    className="group flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[12px] font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]"
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded-lg transition-transform group-hover:scale-105"
                      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                    >
                      <Icon size={13} />
                    </span>
                    <span className="hidden xl:inline">{label}</span>
                  </button>
                );
              })}
            </div>

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
              fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
              minZoom={0.3}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "default" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#232838" />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                nodeColor={(n) => KIND_META[(n.type as NodeKind) ?? "text"]?.color ?? "#7c5cff"}
                nodeStrokeWidth={0}
                maskColor="rgba(6,7,12,0.7)"
                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 12, width: 150, height: 96 }}
              />
            </ReactFlow>
          </div>

          <Inspector
            node={selected}
            onChange={patchSelected}
            onDelete={deleteSelected}
            empty={
              <FlowSummary
                nodes={nodes as unknown as FlowNode[]}
                issues={issues}
                status={status}
                onSelect={setSelectedId}
              />
            }
          />
        </div>
      </div>
    </CatalogContext.Provider>
  );
}
