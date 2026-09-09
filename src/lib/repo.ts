import { db } from "./supabase";
import { getMe, getUserProfile } from "./meta/client";
import { env } from "./env";

/** Janela do Meta: depois de 24h sem mensagem do usuario, nao da pra responder livremente. */
export const WINDOW_HOURS = 24;

export type Account = {
  id: string;
  ig_user_id: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  followers_count: number | null;
};

let accountCache: { value: Account; at: number } | null = null;

/**
 * Devolve a conta conectada, criando/atualizando a partir da Graph API na
 * primeira vez. Cacheia por 5 minutos pra nao bater na Meta a cada request.
 */
export async function getAccount(force = false): Promise<Account> {
  if (!force && accountCache && Date.now() - accountCache.at < 5 * 60_000) {
    return accountCache.value;
  }

  const supabase = db();

  if (!force) {
    const { data } = await supabase.from("mc_accounts").select("*").limit(1).maybeSingle();
    if (data) {
      accountCache = { value: data as Account, at: Date.now() };
      return data as Account;
    }
  }

  const me = await getMe();
  const igUserId = String(me.user_id ?? me.id ?? env.igUserId);
  if (!igUserId) throw new Error("Nao consegui descobrir o ID da conta do Instagram.");

  const { data, error } = await supabase
    .from("mc_accounts")
    .upsert(
      {
        ig_user_id: igUserId,
        username: me.username ?? null,
        name: me.name ?? null,
        profile_picture_url: me.profile_picture_url ?? null,
        followers_count: me.followers_count ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ig_user_id" },
    )
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar a conta: ${error.message}`);
  accountCache = { value: data as Account, at: Date.now() };
  return data as Account;
}

/** Conta conectada sem tocar na Meta. null se ainda nao conectou. Cacheia por 5 minutos na RAM. */
export async function getAccountCached(): Promise<Account | null> {
  if (accountCache && Date.now() - accountCache.at < 5 * 60_000) {
    return accountCache.value;
  }
  const { data } = await db().from("mc_accounts").select("*").limit(1).maybeSingle();
  if (data) {
    accountCache = { value: data as Account, at: Date.now() };
    return data as Account;
  }
  return null;
}

export type Contact = {
  id: string;
  account_id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
};

/** Cria o contato se nao existir e enriquece o perfil quando possivel. */
export async function upsertContact(
  accountId: string,
  igsid: string,
  hints: { username?: string | null; name?: string | null } = {},
): Promise<Contact> {
  const supabase = db();

  const { data: existing } = await supabase
    .from("mc_contacts")
    .select("*")
    .eq("account_id", accountId)
    .eq("igsid", igsid)
    .maybeSingle();

  if (existing) {
    // Preenche username/nome se chegaram agora (comentarios trazem username).
    const patch: Record<string, unknown> = {};
    if (hints.username && !existing.username) patch.username = hints.username;
    if (hints.name && !existing.name) patch.name = hints.name;
    if (Object.keys(patch).length) {
      const { data } = await supabase
        .from("mc_contacts")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      return (data ?? existing) as Contact;
    }
    return existing as Contact;
  }

  const profile = await getUserProfile(igsid);

  const { data, error } = await supabase
    .from("mc_contacts")
    .upsert(
      {
        account_id: accountId,
        igsid,
        username: profile?.username ?? hints.username ?? null,
        name: profile?.name ?? hints.name ?? null,
        profile_picture_url: profile?.profile_pic ?? null,
        is_verified: profile?.is_verified_user ?? false,
        follower_count: profile?.follower_count ?? null,
        is_user_follow_business: profile?.is_user_follow_business ?? null,
        is_business_follow_user: profile?.is_business_follow_user ?? null,
      },
      { onConflict: "account_id,igsid" },
    )
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar contato: ${error.message}`);
  return data as Contact;
}

/**
 * Rebusca o perfil na Graph API e atualiza o contato.
 *
 * Existe por causa do follow gate: `upsertContact` só consulta o perfil quando
 * o contato é criado, então o "segue ou não" congelaria para sempre — e é
 * exatamente o campo que muda quando a pessoa aperta "já te segui".
 *
 * Devolve `null` em is_user_follow_business quando a API não informa. Isso é
 * diferente de `false`: significa "não deu para saber".
 */
export async function refreshContactProfile(
  contactId: string,
  igsid: string,
): Promise<{ followsUs: boolean | null }> {
  const profile = await getUserProfile(igsid);
  if (!profile) return { followsUs: null };

  const followsUs =
    typeof profile.is_user_follow_business === "boolean" ? profile.is_user_follow_business : null;

  // So grava quando a API respondeu: escrever null por cima apagaria um
  // "segue" ja confirmado, e o portao voltaria a barrar quem ja passou.
  const patch: Record<string, unknown> = {};
  if (followsUs !== null) patch.is_user_follow_business = followsUs;
  if (profile.username) patch.username = profile.username;
  if (profile.name) patch.name = profile.name;
  if (profile.profile_pic) patch.profile_picture_url = profile.profile_pic;
  if (typeof profile.follower_count === "number") patch.follower_count = profile.follower_count;

  if (Object.keys(patch).length) {
    await db().from("mc_contacts").update(patch).eq("id", contactId);
  }
  return { followsUs };
}

export async function getOrCreateConversation(accountId: string, contactId: string) {
  const supabase = db();

  const { data: existing } = await supabase
    .from("mc_conversations")
    .select("*")
    .eq("account_id", accountId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("mc_conversations")
    .upsert({ account_id: accountId, contact_id: contactId }, { onConflict: "account_id,contact_id" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar conversa: ${error.message}`);
  return data;
}

export type RecordMessageInput = {
  accountId: string;
  conversationId: string;
  direction: "in" | "out";
  sender: "contact" | "agent" | "bot";
  text?: string | null;
  mid?: string | null;
  type?: string;
  attachments?: unknown;
  payload?: unknown;
  flowId?: string | null;
  status?: string;
  error?: string | null;
};

/**
 * Grava a mensagem e atualiza o resumo da conversa.
 * Mensagens de entrada reabrem a janela de 24h; as de saida nao.
 */
export async function recordMessage(input: RecordMessageInput) {
  const supabase = db();
  const now = new Date();

  const { data, error } = await supabase
    .from("mc_messages")
    .insert({
      account_id: input.accountId,
      conversation_id: input.conversationId,
      direction: input.direction,
      sender: input.sender,
      mid: input.mid ?? null,
      type: input.type ?? "text",
      text: input.text ?? null,
      attachments: input.attachments ?? null,
      payload: input.payload ?? null,
      flow_id: input.flowId ?? null,
      status: input.status ?? "sent",
      error: input.error ?? null,
    })
    .select()
    .single();

  // mid duplicado = o Meta reentregou o mesmo evento. Ignorar e o comportamento certo.
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`Falha ao gravar mensagem: ${error.message}`);
  }

  const patch: Record<string, unknown> = {
    last_message_at: now.toISOString(),
    last_message_preview: (input.text ?? `[${input.type ?? "anexo"}]`).slice(0, 140),
  };
  if (input.direction === "in") {
    patch.window_expires_at = new Date(now.getTime() + WINDOW_HOURS * 3600_000).toISOString();
    patch.status = "open";
  }

  await supabase.from("mc_conversations").update(patch).eq("id", input.conversationId);

  if (input.direction === "in") {
    const { data: conv } = await supabase
      .from("mc_conversations")
      .select("contact_id, unread_count")
      .eq("id", input.conversationId)
      .single();
    if (conv) {
      await supabase
        .from("mc_conversations")
        .update({ unread_count: (conv.unread_count ?? 0) + 1 })
        .eq("id", input.conversationId);
      await supabase
        .from("mc_contacts")
        .update({ last_interaction_at: now.toISOString() })
        .eq("id", conv.contact_id);
    }
  }

  return data;
}

/** true se ainda da pra mandar mensagem livre pra essa conversa. */
export function windowIsOpen(windowExpiresAt: string | null | undefined) {
  if (!windowExpiresAt) return false;
  return new Date(windowExpiresAt).getTime() > Date.now();
}
