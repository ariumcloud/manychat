import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { accessToken } from "@/lib/meta/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERSION = process.env.META_API_VERSION ?? "v23.0";
const BASE =
  (process.env.META_API_FLAVOR ?? "instagram") === "facebook"
    ? `https://graph.facebook.com/${VERSION}`
    : `https://graph.instagram.com/${VERSION}`;

/**
 * Métricas confirmadas contra a API para media_product_type = REELS.
 * `plays`, `profile_visits` e `follows` são recusadas para reels — não inclua.
 */
const REEL_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "shares",
  "saved",
  "total_interactions",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
];

const OTHER_METRICS = ["reach", "likes", "comments", "shares", "saved", "total_interactions"];

type RawMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export type Reel = {
  id: string;
  caption: string;
  isReel: boolean;
  thumbnail: string | null;
  permalink: string | null;
  timestamp: string | null;
  metrics: Record<string, number>;
  /** interações ÷ alcance, em %. null quando não deu para calcular. */
  engagementRate: number | null;
  metricsError: string | null;
};

async function get(path: string, query: Record<string, string> = {}) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  return { ok: res.ok, json };
}

/** Insights vêm como uma lista de métricas; achata para { nome: valor }. */
function flattenInsights(json: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const data = json.data as
    | Array<{
        name?: string;
        values?: Array<{ value?: number }>;
        total_value?: { value?: number };
      }>
    | undefined;

  for (const metric of data ?? []) {
    if (!metric.name) continue;
    const value = metric.values?.[0]?.value ?? metric.total_value?.value;
    if (typeof value === "number") out[metric.name] = value;
  }
  return out;
}

async function getHandler() {
  const media = await get("me/media", {
    fields:
      "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
    limit: "50",
  });

  if (!media.ok) {
    const err = media.json.error as { message?: string } | undefined;
    return NextResponse.json({ error: err?.message ?? "Não consegui listar seus posts." }, { status: 502 });
  }

  const items = (media.json.data as RawMedia[] | undefined) ?? [];

  // Um insights por mídia; em paralelo para a página não demorar.
  const reels = await Promise.all(
    items.map(async (m): Promise<Reel> => {
      const isReel = m.media_product_type === "REELS";
      const metricList = isReel ? REEL_METRICS : OTHER_METRICS;

      const insights = await get(`${m.id}/insights`, { metric: metricList.join(",") });
      const metrics = insights.ok ? flattenInsights(insights.json) : {};

      // like_count/comments_count vêm do próprio post e são mais confiáveis
      // que os insights quando a métrica não é suportada.
      if (typeof m.like_count === "number") metrics.likes = m.like_count;
      if (typeof m.comments_count === "number") metrics.comments = m.comments_count;

      const reach = metrics.reach ?? 0;
      const interactions = metrics.total_interactions ?? 0;

      return {
        id: m.id,
        caption: m.caption ?? "",
        isReel,
        thumbnail: m.thumbnail_url ?? m.media_url ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
        metrics,
        engagementRate: reach > 0 ? (interactions / reach) * 100 : null,
        metricsError: insights.ok
          ? null
          : ((insights.json.error as { message?: string } | undefined)?.message ?? "sem métricas"),
      };
    }),
  );

  return NextResponse.json({ reels });
}

export const GET = withApi(getHandler);
