import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { listMedia, MetaError, type IgMedia } from "@/lib/meta/client";
import { createAutomation } from "@/lib/automations";
import { DEFAULT_ASK_FOLLOW_TEXT } from "@/lib/flow/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Servidor MCP do app (Streamable HTTP, sem estado, respostas em JSON). Deixa
 * o Claude listar reels e criar automacoes do mesmo jeito que o painel.
 *
 * A chave vai na URL (/api/mcp/<chave>) porque e o que o conector do Claude
 * aceita; o banco guarda so o sha256 dela (mc_accounts.mcp_secret_hash). Fica
 * fora do login do painel (ver proxy.ts).
 */

type Params = { params: Promise<{ secret: string }> };
type RpcMessage = { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const PROTOCOL_VERSION = "2025-06-18";

async function authorized(secret: string): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const { data } = await db()
    .from("mc_accounts")
    .select("mcp_secret_hash")
    .not("mcp_secret_hash", "is", null)
    .limit(1)
    .maybeSingle();
  const stored = data?.mcp_secret_hash as string | undefined;
  if (!stored) return false;
  const given = crypto.createHash("sha256").update(secret).digest("hex");
  return stored.length === given.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(given));
}

// --- Ferramentas -------------------------------------------------------------

const TOOLS = [
  {
    name: "listar_reels",
    description:
      "Lista os posts/reels mais recentes do Instagram, com media_id, data, link, legenda e se já existe automação ligada neles.",
    inputSchema: {
      type: "object",
      properties: { quantidade: { type: "number", description: "Quantos listar (padrão 12, máx. 30)." } },
    },
  },
  {
    name: "criar_automacao",
    description:
      "Cria uma automação de comentário → DM num reel, já publicada: portão 'me segue' com botão JÁ TE SEGUI, 8 respostas públicas variadas, 6 variações de texto na DM, link dentro de botão e botão do grupo de networking. A palavra-chave aceita erro de digitação (1 letra trocada ou 2 vizinhas invertidas, em palavras de 5+ letras).",
    inputSchema: {
      type: "object",
      required: ["reel", "palavras_chave", "link_conteudo"],
      properties: {
        reel: { type: "string", description: "Link do reel (instagram.com/reel/...) ou o media_id." },
        palavras_chave: {
          type: "array",
          items: { type: "string" },
          description: "Palavras que disparam a automação (maiúsculas/acentos não importam).",
        },
        link_conteudo: { type: "string", description: "Link que a pessoa recebe (https://...)." },
        texto: { type: "string", description: "Mensagem principal da DM (padrão 'Ta na mão!'). Recebe 5 variações automáticas." },
        rotulo_botao: { type: "string", description: "Texto do botão do link, até 20 caracteres (padrão 'Ver agora!')." },
        grupo: { type: "boolean", description: "Incluir o botão do grupo de networking (padrão true)." },
        portao_seguir: { type: "boolean", description: "Só entrega para quem segue a conta (padrão true)." },
        nome: { type: "string", description: "Nome do fluxo no painel (padrão: a primeira palavra-chave)." },
      },
    },
  },
  {
    name: "listar_automacoes",
    description: "Lista as automações de comentário, com palavras-chave, reel, se estão ligadas e quantas DMs saíram.",
    inputSchema: {
      type: "object",
      properties: { apenas_ligadas: { type: "boolean", description: "Só as ligadas (padrão true)." } },
    },
  },
  {
    name: "ligar_desligar_automacao",
    description: "Liga ou desliga uma automação pelo id (veja listar_automacoes).",
    inputSchema: {
      type: "object",
      required: ["automacao_id", "ligada"],
      properties: { automacao_id: { type: "string" }, ligada: { type: "boolean" } },
    },
  },
];

class ToolError extends Error {}

function shortcode(link: string): string | null {
  return link.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

async function resolveReel(reel: string): Promise<IgMedia | { id: string }> {
  const value = reel.trim();
  if (/^\d{8,}$/.test(value)) return { id: value };
  const code = shortcode(value);
  if (!code) throw new ToolError("Não entendi o reel: mande o link (instagram.com/reel/...) ou o media_id.");
  const media = await listMedia(50);
  const found = media.find((m) => m.permalink && shortcode(m.permalink) === code);
  if (!found) throw new ToolError("Esse reel não está entre os 50 posts mais recentes da conta.");
  return found;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const account = await getAccount();
  const supabase = db();

  if (name === "listar_reels") {
    const n = Math.min(Math.max(Number(args.quantidade) || 12, 1), 30);
    const media = await listMedia(n);
    const { data: triggers } = await supabase
      .from("mc_triggers")
      .select("media_id, keywords, enabled")
      .eq("account_id", account.id)
      .in("media_id", media.map((m) => m.id));
    return media
      .map((m) => {
        const auto = (triggers ?? []).filter((t) => t.media_id === m.id && t.enabled);
        const caption = (m.caption ?? "").replace(/\s+/g, " ").slice(0, 80);
        return [
          `• media_id ${m.id} — ${m.timestamp?.slice(0, 10) ?? "?"} — ${m.media_type ?? ""} — ${m.comments_count ?? 0} comentários`,
          `  ${m.permalink ?? ""}`,
          `  "${caption}"`,
          `  automação: ${auto.length ? auto.map((t) => (t.keywords as string[]).join("/")).join(", ") : "nenhuma"}`,
        ].join("\n");
      })
      .join("\n");
  }

  if (name === "criar_automacao") {
    const keywords = (
      Array.isArray(args.palavras_chave) ? args.palavras_chave : String(args.palavras_chave ?? "").split(",")
    )
      .map((k) => String(k).trim())
      .filter(Boolean);
    const link = String(args.link_conteudo ?? "").trim();
    if (!keywords.length) throw new ToolError("Informe pelo menos uma palavra-chave.");
    if (!/^https?:\/\//i.test(link)) throw new ToolError("link_conteudo precisa começar com http(s)://.");

    const media = await resolveReel(String(args.reel ?? ""));

    // Mesma palavra no mesmo reel = duas automacoes brigando pelo comentario.
    const { data: existing } = await supabase
      .from("mc_triggers")
      .select("id, keywords, flows:mc_flows(name)")
      .eq("account_id", account.id)
      .eq("media_id", media.id)
      .eq("enabled", true);
    const lower = keywords.map((k) => k.toLowerCase());
    const clash = (existing ?? []).find((t) => (t.keywords as string[]).some((k) => lower.includes(k.toLowerCase())));
    if (clash) {
      throw new ToolError(
        `Esse reel já tem uma automação ligada com essa palavra (id ${clash.id}). Desligue-a antes com ligar_desligar_automacao.`,
      );
    }

    const gate = args.portao_seguir !== false;
    const result = await createAutomation(account.id, {
      name: typeof args.nome === "string" && args.nome.trim() ? args.nome.trim() : keywords[0],
      kind: "comment_keyword",
      keywords,
      match_type: "contains",
      media_id: media.id,
      dm_text: typeof args.texto === "string" && args.texto.trim() ? args.texto.trim() : "Ta na mão!",
      button_label: typeof args.rotulo_botao === "string" && args.rotulo_botao.trim() ? args.rotulo_botao.trim() : "Ver agora!",
      button_url: link,
      public_reply_enabled: true,
      public_reply_texts: [],
      only_first_time: false,
      follow_gate_enabled: gate,
      follow_gate_text: DEFAULT_ASK_FOLLOW_TEXT,
      follow_gate_button: "JÁ TE SEGUI ✅",
      group_button_enabled: args.grupo !== false,
    });
    if (!result.ok) throw new ToolError(result.error);

    const permalink = "permalink" in media ? media.permalink : undefined;
    return [
      `Automação criada e ligada: "${result.flow.name}" (fluxo ${result.flow.id}).`,
      `Reel: ${permalink ?? media.id}`,
      `Palavras-chave: ${keywords.join(", ")} (aceita 1 erro de digitação nas de 5+ letras)`,
      `Portão "me segue": ${gate ? "sim" : "não"} · botão do grupo: ${args.grupo !== false ? "sim" : "não"}`,
      "Respostas no comentário: 8 variações · DM: 6 variações de texto, link dentro de botão.",
    ].join("\n");
  }

  if (name === "listar_automacoes") {
    let query = supabase
      .from("mc_triggers")
      .select("id, keywords, media_id, enabled, created_at, flows:mc_flows(name)")
      .eq("account_id", account.id)
      .eq("kind", "comment_keyword")
      .order("created_at", { ascending: false })
      .limit(60);
    if (args.apenas_ligadas !== false) query = query.eq("enabled", true);
    const { data: triggers, error } = await query;
    if (error) throw new ToolError(error.message);
    if (!triggers?.length) return "Nenhuma automação encontrada.";

    const { data: events } = await supabase
      .from("mc_comment_events")
      .select("matched_trigger_id, dm_sent")
      .in("matched_trigger_id", triggers.map((t) => t.id));
    return triggers
      .map((t) => {
        const mine = (events ?? []).filter((e) => e.matched_trigger_id === t.id);
        const flowName = (t.flows as unknown as { name?: string } | null)?.name ?? "?";
        return `• ${flowName} — id ${t.id} — ${t.enabled ? "ligada" : "desligada"} — palavras: ${(t.keywords as string[]).join(", ")} — reel ${t.media_id ?? "qualquer"} — ${mine.filter((e) => e.dm_sent).length}/${mine.length} DMs`;
      })
      .join("\n");
  }

  if (name === "ligar_desligar_automacao") {
    const id = String(args.automacao_id ?? "");
    const { data, error } = await supabase
      .from("mc_triggers")
      .update({ enabled: Boolean(args.ligada) })
      .eq("id", id)
      .eq("account_id", account.id)
      .select("id, enabled")
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Automação não encontrada.");
    return `Automação ${data.id} ${data.enabled ? "ligada" : "desligada"}.`;
  }

  throw new ToolError(`Ferramenta desconhecida: ${name}`);
}

// --- JSON-RPC ------------------------------------------------------------------

async function handle(msg: RpcMessage): Promise<object | null> {
  const isNotification = msg.id === undefined || msg.id === null;
  const reply = (result: object) => ({ jsonrpc: "2.0", id: msg.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });

  switch (msg.method) {
    case "initialize":
      return reply({
        protocolVersion:
          typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "manychat-instagram", version: "1.0.0" },
        instructions:
          "Automações de Instagram (comentário → DM). Para criar: use listar_reels para achar o reel (ou peça o link), depois criar_automacao com reel, palavras_chave e link_conteudo. Tudo já sai com variações, portão de seguir e botão do grupo.",
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const text = await callTool(name, args);
        return reply({ content: [{ type: "text", text }] });
      } catch (err) {
        const text =
          err instanceof ToolError
            ? err.message
            : err instanceof MetaError
              ? `Instagram respondeu: ${err.message}`
              : `Erro: ${err instanceof Error ? err.message : String(err)}`;
        return reply({ content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      if (isNotification) return null;
      return fail(-32601, `Método não suportado: ${msg.method}`);
  }
}

export async function POST(req: Request, { params }: Params) {
  const { secret } = await params;
  if (!(await authorized(secret))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: RpcMessage | RpcMessage[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 });
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map(handle))).filter((r): r is object => r !== null);
  if (!responses.length) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}

/** Sem stream de notificacoes do servidor: o transporte e so request/response. */
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
