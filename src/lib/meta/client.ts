import { env } from "../env";
import { accessToken, forgetAccessToken, saveAccessToken } from "./token";

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
  retried = false,
): Promise<T> {
  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
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
    // 190 = token invalido. Pode ser o cache desta instancia segurando um
    // token ja trocado pela renovacao: relê e tenta uma vez. Com token
    // invalido nada foi enviado, entao repetir nao duplica mensagem.
    if (err?.code === 190 && !retried) {
      forgetAccessToken();
      return call<T>(path, init, true);
    }
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

/**
 * Botao fixo na mensagem (button template). E o unico formato de botao do
 * sistema: fica grudado na mensagem, ao contrario do quick reply, que some
 * assim que a pessoa manda qualquer coisa. O clique num "postback" chega no
 * webhook como `postback.payload`.
 */
export type TemplateButton =
  | { type: "web_url"; title: string; url: string }
  | { type: "postback"; title: string; payload: string };

type SendResult = { recipient_id?: string; message_id?: string };

type Recipient = { id: string } | { comment_id: string };

async function send(recipient: Recipient, message: unknown): Promise<SendResult> {
  return call<SendResult>(`${selfId()}/messages`, {
    method: "POST",
    body: { recipient, message },
  });
}

/** Texto puro, ou card com ate 3 botoes quando houver botao. */
function textOrButtons(text: string, buttons?: TemplateButton[]) {
  if (!buttons?.length) return { text };
  return {
    attachment: {
      type: "template",
      payload: { template_type: "button", text, buttons: buttons.slice(0, 3) },
    },
  };
}

export function sendText(igsid: string, text: string) {
  return send({ id: igsid }, { text });
}

export function sendImage(igsid: string, url: string) {
  return send({ id: igsid }, { attachment: { type: "image", payload: { url } } });
}

/** Card com ate 3 botoes (web_url ou postback). */
export function sendButtons(igsid: string, text: string, buttons: TemplateButton[]) {
  return send({ id: igsid }, textOrButtons(text, buttons));
}

/**
 * DM disparada por um comentario ("private reply").
 * E ISTO que faz o comentario->DM funcionar: em vez de recipient.id usamos
 * recipient.comment_id. So pode ser usado UMA vez por comentario e dentro de
 * 7 dias. Nao exige que a pessoa ja tenha te mandado DM antes.
 *
 * Como e a unica mensagem permitida ate a pessoa responder, o botao precisa
 * vir DENTRO dela: o card de botoes tambem vale como private reply.
 */
export function sendPrivateReply(commentId: string, text: string, buttons?: TemplateButton[]) {
  return send({ comment_id: commentId }, textOrButtons(text, buttons));
}

/**
 * Card do carrossel (generic template): imagem, titulo, subtitulo e ate 3
 * botoes. O Instagram aceita ate 10 cards, titulo e subtitulo de ate 80
 * caracteres.
 */
export type GenericElement = {
  title: string;
  subtitle?: string;
  image_url: string;
  buttons?: TemplateButton[];
};

/**
 * Carrossel de cards, so por DM. Numa resposta a comentario ele nao e usado:
 * a doc da Meta so documenta generic template com recipient.id.
 */
export function sendGeneric(igsid: string, elements: GenericElement[]) {
  return send({ id: igsid }, {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        // Campo vazio vai omitido: subtitle "" e buttons [] nao tem por que ir.
        elements: elements.slice(0, 10).map(({ title, subtitle, image_url, buttons }) => ({
          title: title.slice(0, 80),
          image_url,
          ...(subtitle ? { subtitle: subtitle.slice(0, 80) } : {}),
          ...(buttons?.length ? { buttons: buttons.slice(0, 3) } : {}),
        })),
      },
    },
  });
}

// --- Comentarios -----------------------------------------------------------

/** Resposta publica embaixo do comentario. */
export function replyToComment(commentId: string, message: string) {
  return call<{ id: string }>(`${commentId}/replies`, { method: "POST", body: { message } });
}

export type IgComment = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
};

/** Comentarios de um post. Pagina ate `limit`, porque a API devolve de 25 em 25. */
export async function listComments(mediaId: string, limit = 200): Promise<IgComment[]> {
  const out: IgComment[] = [];
  let after: string | undefined;

  while (out.length < limit) {
    const res = await call<{ data: IgComment[]; paging?: { cursors?: { after?: string } } }>(
      `${mediaId}/comments`,
      {
        query: {
          fields: "id,text,username,timestamp,like_count",
          limit: "50",
          ...(after ? { after } : {}),
        },
      },
    );

    const batch = res.data ?? [];
    out.push(...batch);

    after = res.paging?.cursors?.after;
    if (!after || batch.length === 0) break;
  }

  return out.slice(0, limit);
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

// --- Publicacao --------------------------------------------------------------

/**
 * Publicar carrossel sao tres etapas: um container por imagem, um container do
 * carrossel apontando para eles, e so entao o publish. As imagens precisam
 * estar em URLs publicas — o Instagram e quem baixa.
 */
export async function createCarouselItem(imageUrl: string): Promise<string> {
  const res = await call<{ id: string }>(`${selfId()}/media`, {
    method: "POST",
    query: { image_url: imageUrl, is_carousel_item: "true" },
  });
  return res.id;
}

export async function createCarouselContainer(
  childrenIds: string[],
  caption: string,
): Promise<string> {
  const res = await call<{ id: string }>(`${selfId()}/media`, {
    method: "POST",
    query: {
      media_type: "CAROUSEL",
      children: childrenIds.join(","),
      caption,
    },
  });
  return res.id;
}

export async function getContainerStatus(containerId: string) {
  return call<{ status_code?: string; status?: string }>(containerId, {
    query: { fields: "status_code,status" },
  });
}

/** Passo irreversivel: a partir daqui o post esta no ar. */
export async function publishContainer(creationId: string): Promise<string> {
  const res = await call<{ id: string }>(`${selfId()}/media_publish`, {
    method: "POST",
    query: { creation_id: creationId },
  });
  return res.id;
}

// --- Diagnostico do token --------------------------------------------------

export type TokenStatus = {
  valid: boolean;
  username?: string;
  userId?: string;
  error?: string;
};

/**
 * Checa se o token vive, sem efeito colateral.
 *
 * Nao da pra usar o /debug_token aqui: ele exige um token do Facebook, e um
 * token de Instagram Login nao carrega app id do FB — a chamada volta com
 * "Cannot get application info". Um GET /me prova a mesma coisa.
 */
export async function inspectToken(): Promise<TokenStatus> {
  try {
    const me = await call<{ user_id?: string; id?: string; username?: string }>("me", {
      query: { fields: "user_id,username" },
    });
    return { valid: true, username: me.username, userId: me.user_id ?? me.id };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type RefreshedToken = {
  expiresInSeconds: number;
  permissions: string[];
};

/**
 * Renova o token de longa duracao e grava o novo em mc_accounts, de onde o
 * app passa a le-lo — nao precisa mais colar nada na Vercel. De quebra e a
 * unica forma de descobrir validade e permissoes de um token de Instagram
 * Login.
 *
 * Roda pelo cron semanal (api/cron/refresh-token) e pelo botao em
 * Configuracoes. Nunca chame em render de pagina.
 */
export async function refreshLongLivedToken(): Promise<RefreshedToken> {
  const url =
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token` +
    `&access_token=${encodeURIComponent(await accessToken())}`;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    permissions?: string;
    error?: { message?: string };
  };

  if (!res.ok || !json.access_token || !json.expires_in) {
    throw new MetaError(
      json.error?.message ?? `A Graph API respondeu ${res.status}.`,
      res.status,
      json,
    );
  }

  await saveAccessToken(json.access_token, json.expires_in);

  return {
    expiresInSeconds: json.expires_in,
    permissions: (json.permissions ?? "").split(",").map((p) => p.trim()).filter(Boolean),
  };
}

export const metaConfig = { flavor: FLAVOR, version: VERSION, base: BASE };
