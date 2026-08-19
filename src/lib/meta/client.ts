import { env } from "../env";

/**
 * Existem dois "sabores" da API de mensagens do Instagram:
 *
 *  - "instagram"  -> Instagram API com Instagram Login (graph.instagram.com).
 *                    Voce loga direto com a conta business do IG. E o caminho novo.
 *  - "facebook"   -> Instagram API com Facebook Login (graph.facebook.com).
 *                    A conta IG esta vinculada a uma Pagina do Facebook.
 *
 * Defina META_API_FLAVOR no .env se precisar trocar. Default: instagram.
 */
const FLAVOR = (process.env.META_API_FLAVOR ?? "instagram") as "instagram" | "facebook";
const VERSION = process.env.META_API_VERSION ?? "v23.0";
const BASE =
  FLAVOR === "facebook"
    ? `https://graph.facebook.com/${VERSION}`
    : `https://graph.instagram.com/${VERSION}`;

export class MetaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "MetaError";
  }
}

async function call<T>(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.igAccessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: number } }).error;
    throw new MetaError(err?.message ?? `Graph API respondeu ${res.status}`, res.status, json);
  }
  return json as T;
}

/** ID da conta usado nos endpoints de envio. "me" funciona nos dois sabores. */
function selfId() {
  return env.igUserId || "me";
}

// --- Perfil da conta -------------------------------------------------------

export type IgAccount = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
};

export async function getMe(): Promise<IgAccount> {
  const fields =
    FLAVOR === "facebook"
      ? "id,username,name,profile_picture_url,followers_count"
      : "user_id,username,name,profile_picture_url,followers_count";
  return call<IgAccount>("me", { query: { fields } });
}

// --- Perfil de um contato --------------------------------------------------

export type IgUserProfile = {
  name?: string;
  username?: string;
  profile_pic?: string;
  follower_count?: number;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
  is_verified_user?: boolean;
};

export async function getUserProfile(igsid: string): Promise<IgUserProfile | null> {
  try {
    return await call<IgUserProfile>(igsid, {
      query: {
        fields:
          "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user,is_verified_user",
      },
    });
  } catch {
    // Perfil e best-effort: permissoes variam por app e o envio nao pode falhar por isso.
    return null;
  }
}

// --- Envio de mensagens ----------------------------------------------------

export type QuickReply = { title: string; payload: string };

type SendResult = { recipient_id?: string; message_id?: string };

type Recipient = { id: string } | { comment_id: string };

async function send(recipient: Recipient, message: unknown): Promise<SendResult> {
  return call<SendResult>(`${selfId()}/messages`, {
    method: "POST",
    body: { recipient, message },
  });
}

function withQuickReplies(text: string, quickReplies?: QuickReply[]) {
  const message: Record<string, unknown> = { text };
  if (quickReplies?.length) {
    message.quick_replies = quickReplies.slice(0, 13).map((q) => ({
      content_type: "text",
      title: q.title.slice(0, 20),
      payload: q.payload,
    }));
  }
  return message;
}

export function sendText(igsid: string, text: string, quickReplies?: QuickReply[]) {
  return send({ id: igsid }, withQuickReplies(text, quickReplies));
}

export function sendImage(igsid: string, url: string) {
  return send({ id: igsid }, { attachment: { type: "image", payload: { url } } });
}

/** Card com ate 3 botoes (web_url ou postback). */
export function sendButtons(
  igsid: string,
  text: string,
  buttons: Array<
    | { type: "web_url"; title: string; url: string }
    | { type: "postback"; title: string; payload: string }
  >,
) {
  return send(
    { id: igsid },
    {
      attachment: {
        type: "template",
        payload: { template_type: "button", text, buttons: buttons.slice(0, 3) },
      },
    },
  );
}

/**
 * DM disparada por um comentario ("private reply").
 * E ISTO que faz o comentario->DM funcionar: em vez de recipient.id usamos
 * recipient.comment_id. So pode ser usado UMA vez por comentario e dentro de
 * 7 dias. Nao exige que a pessoa ja tenha te mandado DM antes.
 */
export function sendPrivateReply(commentId: string, text: string, quickReplies?: QuickReply[]) {
  return send({ comment_id: commentId }, withQuickReplies(text, quickReplies));
}

// --- Comentarios -----------------------------------------------------------

/** Resposta publica embaixo do comentario. */
export function replyToComment(commentId: string, message: string) {
  return call<{ id: string }>(`${commentId}/replies`, { method: "POST", body: { message } });
}

export function hideComment(commentId: string, hide = true) {
  return call<{ success: boolean }>(commentId, { method: "POST", body: { hide } });
}

// --- Midia -----------------------------------------------------------------

export type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  comments_count?: number;
  like_count?: number;
};

export async function listMedia(limit = 25): Promise<IgMedia[]> {
  const res = await call<{ data: IgMedia[] }>(`${selfId()}/media`, {
    query: {
      fields:
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count",
      limit: String(limit),
    },
  });
  return res.data ?? [];
}

// --- Diagnostico do token --------------------------------------------------

export async function debugToken() {
  const url =
    `https://graph.facebook.com/${VERSION}/debug_token` +
    `?input_token=${encodeURIComponent(env.igAccessToken)}` +
    `&access_token=${encodeURIComponent(`${env.metaAppId}|${env.metaAppSecret}`)}`;
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export const metaConfig = { flavor: FLAVOR, version: VERSION, base: BASE };
