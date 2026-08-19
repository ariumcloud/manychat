import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERSION = process.env.META_API_VERSION ?? "v23.0";
const BASE =
  (process.env.META_API_FLAVOR ?? "instagram") === "facebook"
    ? `https://graph.facebook.com/${VERSION}`
    : `https://graph.instagram.com/${VERSION}`;

type TestResult = {
  id: string;
  permission: string;
  label: string;
  endpoint: string;
  ok: boolean;
  status: number;
  detail: string;
};

async function call(path: string, query: Record<string, string> = {}) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.igAccessToken}` },
    cache: "no-store",
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, ok: res.ok, json };
}

/** Resume a resposta em uma frase legível, sem despejar JSON cru na tela. */
function describe(ok: boolean, json: Record<string, unknown>, onOk: (j: never) => string): string {
  if (!ok) {
    const err = json.error as { message?: string } | undefined;
    return err?.message ?? JSON.stringify(json).slice(0, 200);
  }
  try {
    return onOk(json as never);
  } catch {
    return "respondeu OK";
  }
}

/**
 * Dispara uma chamada de leitura por permissão. O Meta exige pelo menos uma
 * chamada por permissão antes de liberar o envio para App Review — esta rota
 * cobre todas as que dão para satisfazer sem escrever nada na conta.
 */
async function postHandler() {
  const results: TestResult[] = [];

  // 1. instagram_business_basic + public_profile
  const me = await call("me", {
    fields: "user_id,username,name,profile_picture_url,followers_count",
  });
  results.push({
    id: "basic",
    permission: "instagram_business_basic / public_profile",
    label: "Ler o perfil da conta",
    endpoint: "GET /me",
    ok: me.ok,
    status: me.status,
    detail: describe(me.ok, me.json, (j: { username?: string; followers_count?: number }) =>
      `@${j.username} · ${j.followers_count ?? 0} seguidores`,
    ),
  });

  // 2. Lista de posts — também serve de insumo para o teste de comentários
  const media = await call("me/media", {
    fields: "id,caption,permalink,comments_count",
    limit: "5",
  });
  results.push({
    id: "media",
    permission: "instagram_business_basic",
    label: "Listar os posts",
    endpoint: "GET /me/media",
    ok: media.ok,
    status: media.status,
    detail: describe(media.ok, media.json, (j: { data?: unknown[] }) =>
      `${j.data?.length ?? 0} post(s) retornado(s)`,
    ),
  });

  // 3. instagram_business_manage_messages
  const conversations = await call("me/conversations", { fields: "id,updated_time" });
  results.push({
    id: "messages",
    permission: "instagram_business_manage_messages",
    label: "Listar conversas de DM",
    endpoint: "GET /me/conversations",
    ok: conversations.ok,
    status: conversations.status,
    detail: describe(conversations.ok, conversations.json, (j: { data?: unknown[] }) =>
      `${j.data?.length ?? 0} conversa(s)`,
    ),
  });

  // 4. instagram_business_manage_insights
  const insights = await call("me/insights", {
    metric: "reach",
    period: "day",
    metric_type: "total_value",
  });
  results.push({
    id: "insights",
    permission: "instagram_business_manage_insights",
    label: "Ler métricas da conta",
    endpoint: "GET /me/insights?metric=reach",
    ok: insights.ok,
    status: insights.status,
    detail: describe(insights.ok, insights.json, (j: { data?: Array<{ name?: string }> }) =>
      `métrica "${j.data?.[0]?.name ?? "reach"}" retornada`,
    ),
  });

  // 5. instagram_business_manage_comments + instagram_manage_comments
  const mediaId = (media.json.data as Array<{ id?: string }> | undefined)?.[0]?.id;
  if (mediaId) {
    const comments = await call(`${mediaId}/comments`, {
      fields: "id,text,username,timestamp",
      limit: "5",
    });
    results.push({
      id: "comments",
      permission: "instagram_business_manage_comments / instagram_manage_comments",
      label: "Ler comentários de um post",
      endpoint: "GET /{media-id}/comments",
      ok: comments.ok,
      status: comments.status,
      detail: describe(comments.ok, comments.json, (j: { data?: unknown[] }) =>
        `${j.data?.length ?? 0} comentário(s) no post mais recente`,
      ),
    });
  } else {
    results.push({
      id: "comments",
      permission: "instagram_business_manage_comments / instagram_manage_comments",
      label: "Ler comentários de um post",
      endpoint: "GET /{media-id}/comments",
      ok: false,
      status: 0,
      detail: "Nenhum post na conta para testar. Publique algo e rode de novo.",
    });
  }

  return NextResponse.json({
    results,
    passed: results.filter((r) => r.ok).length,
    total: results.length,
  });
}

export const POST = withApi(postHandler);
