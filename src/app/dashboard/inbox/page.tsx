"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Bot, Clock, Inbox as InboxIcon, Loader2, MessageSquare, Search, Send, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import { fetchJson } from "@/lib/fetchJson";

type Conversation = {
  id: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  window_expires_at: string | null;
  contacts: {
    id: string;
    igsid: string;
    username: string | null;
    name: string | null;
    profile_picture_url: string | null;
    follower_count?: number | null;
    is_user_follow_business?: boolean | null;
    is_verified?: boolean | null;
  } | null;
};

type Message = {
  id: string;
  direction: "in" | "out";
  sender: "contact" | "agent" | "bot";
  text: string | null;
  type: string;
  status: string;
  error: string | null;
  created_at: string;
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      const { ok, data, error: err } = await fetchJson<{ conversations: Conversation[] }>(
        "/api/conversations",
      );
      if (ok) setConversations(data?.conversations ?? []);
      setListError(ok ? null : err);
      setNow(Date.now());
      setLoading(false);
    }

    void loadConversations();
    // O Instagram não manda push pro navegador: o jeito é reconsultar.
    const id = setInterval(loadConversations, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    void (async () => {
      const { ok, data, error: err } = await fetchJson<{ messages: Message[] }>(
        `/api/messages?conversationId=${activeId}`,
      );
      if (cancelled) return;
      setMessages(ok ? (data?.messages ?? []) : []);
      setError(ok ? null : err);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  // `now` vem do state (atualizado pelo mesmo intervalo) para o render ficar puro.
  const windowOpen = active?.window_expires_at
    ? new Date(active.window_expires_at).getTime() > now
    : false;

  async function send() {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    setError(null);

    const { ok, data, error: err } = await fetchJson<{ message: Message }>("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, text: draft }),
    });

    if (ok && data?.message) {
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } else {
      setError(err ?? "Falhou ao enviar.");
    }
    setSending(false);
  }

  const label = (c: Conversation) =>
    c.contacts?.username ? `@${c.contacts.username}` : (c.contacts?.name ?? "contato");
  const q = search.trim().toLowerCase();
  const shown = conversations.filter(
    (c) => (!onlyUnread || c.unread_count > 0) && (!q || label(c).toLowerCase().includes(q)),
  );
  const unread = conversations.filter((c) => c.unread_count > 0).length;

  const fromBot = messages.filter((m) => m.sender === "bot").length;
  const fromAgent = messages.filter((m) => m.sender === "agent").length;
  const fromContact = messages.filter((m) => m.sender === "contact").length;

  return (
    <div className="flex h-screen">
      {/* Lista */}
      <div className="flex w-[320px] shrink-0 flex-col border-r border-[var(--border)]">
        <div className="space-y-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[17px] font-semibold tracking-tight">Inbox</h1>
            <span className="text-[11px] text-[var(--fg-dim)]">{conversations.length} conversas</span>
          </div>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-dim)]" />
            <input
              className="input !py-2 !pl-9 text-[13px]"
              placeholder="Buscar @usuário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {(
              [
                [false, "Todas"],
                [true, `Não lidas${unread ? ` (${unread})` : ""}`],
              ] as const
            ).map(([value, text]) => (
              <button
                key={text}
                onClick={() => setOnlyUnread(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  onlyUnread === value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-[var(--fg-muted)]">
              <Loader2 size={15} className="animate-spin" /> carregando…
            </div>
          ) : listError ? (
            <p className="p-5 text-sm text-[var(--danger)]">{listError}</p>
          ) : shown.length === 0 ? (
            <p className="p-5 text-sm text-[var(--fg-dim)]">
              {conversations.length === 0
                ? "Nenhuma conversa ainda. Elas aparecem quando alguém te manda DM."
                : "Nada encontrado."}
            </p>
          ) : (
            shown.map((c) => {
              const open = c.window_expires_at ? new Date(c.window_expires_at).getTime() > now : false;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "relative flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors",
                    activeId === c.id ? "bg-[var(--accent-soft)]" : "hover:bg-[rgba(255,255,255,0.025)]",
                  )}
                >
                  {activeId === c.id && <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--accent)]" />}
                  <div className="relative shrink-0">
                    <Avatar name={label(c)} src={c.contacts?.profile_picture_url} size={38} />
                    <span
                      title={open ? "janela de 24h aberta" : "janela fechada"}
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg)]",
                        open ? "bg-[var(--success)]" : "bg-[var(--fg-dim)]",
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("truncate text-[13px]", c.unread_count > 0 ? "font-semibold" : "font-medium")}>
                        {label(c)}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-[var(--fg-dim)]">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className="truncate text-xs text-[var(--fg-muted)]">{c.last_message_preview ?? "—"}</p>
                  </div>

                  {c.unread_count > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-medium text-white">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversa */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <InboxIcon size={24} />
              </span>
              <h2 className="mt-4 text-sm font-semibold">Escolha uma conversa</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                As respostas automáticas aparecem aqui com o selo &ldquo;automático&rdquo;. Você pode
                assumir a conversa e responder à mão enquanto a janela de 24h do Instagram estiver
                aberta.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-left">
                {[
                  ["Abertas", conversations.filter((c) => c.window_expires_at && new Date(c.window_expires_at).getTime() > now).length],
                  ["Não lidas", unread],
                  ["Total", conversations.length],
                ].map(([k, v]) => (
                  <div key={k as string} className="card px-3 py-2.5">
                    <p className="text-[11px] text-[var(--fg-dim)]">{k}</p>
                    <p className="text-lg font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-3.5">
              <Avatar name={label(active)} src={active.contacts?.profile_picture_url} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{label(active)}</p>
                {active.contacts?.name && active.contacts.username && (
                  <p className="truncate text-[11px] text-[var(--fg-dim)]">{active.contacts.name}</p>
                )}
              </div>
              <span className={cn("ml-auto", windowOpen ? "chip chip-ok" : "chip chip-warn")}>
                {windowOpen ? "janela de 24h aberta" : "janela fechada"}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-5">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[68%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                      m.direction === "out"
                        ? "rounded-br-md text-white"
                        : "rounded-bl-md bg-[var(--bg-elev-2)] text-[var(--fg)]",
                      m.status === "failed" && "opacity-60 ring-1 ring-[var(--danger)]",
                    )}
                    style={m.direction === "out" ? { background: "linear-gradient(135deg,#7c5cff,#5b6bff)" } : undefined}
                  >
                    {m.sender === "bot" && (
                      <span className="mb-1 flex items-center gap-1 text-[11px] opacity-80">
                        <Bot size={11} /> automático
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.text ?? `[${m.type}]`}</p>
                    <span className="mt-1 block text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {m.error && <p className="mt-1 text-[11px] text-[var(--danger)]">{m.error}</p>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-[var(--border)] px-6 py-3.5">
              {!windowOpen && (
                <p className="mb-2 text-xs text-[var(--warn)]">
                  A janela de 24h fechou. O Instagram bloqueia respostas depois desse prazo — só dá
                  pra retomar quando a pessoa mandar mensagem de novo.
                </p>
              )}
              {error && <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>}
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Escreva uma resposta…"
                  value={draft}
                  disabled={!windowOpen}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={send} disabled={sending || !windowOpen || !draft.trim()}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contato */}
      {active && (
        <aside className="hidden w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] p-5 xl:flex">
          <div className="text-center">
            <Avatar name={label(active)} src={active.contacts?.profile_picture_url} size={64} className="mx-auto" />
            <p className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold">
              {label(active)}
              {active.contacts?.is_verified && <BadgeCheck size={14} className="text-[var(--accent)]" />}
            </p>
            {active.contacts?.name && <p className="text-xs text-[var(--fg-dim)]">{active.contacts.name}</p>}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {active.contacts?.is_user_follow_business === true && (
              <span className="chip chip-ok">
                <UserCheck size={11} /> segue você
              </span>
            )}
            {active.contacts?.is_user_follow_business === false && <span className="chip chip-warn">não segue</span>}
            {typeof active.contacts?.follower_count === "number" && (
              <span className="chip">{active.contacts.follower_count.toLocaleString("pt-BR")} seguidores</span>
            )}
          </div>

          <dl className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/40 p-3.5 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-[var(--fg-muted)]"><MessageSquare size={13} /> Mensagens</dt>
              <dd className="font-semibold tabular-nums">{messages.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="pl-5 text-xs text-[var(--fg-dim)]">da pessoa</dt>
              <dd className="tabular-nums text-[var(--fg-muted)]">{fromContact}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="pl-5 text-xs text-[var(--fg-dim)]">automáticas</dt>
              <dd className="tabular-nums text-[var(--fg-muted)]">{fromBot}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="pl-5 text-xs text-[var(--fg-dim)]">suas</dt>
              <dd className="tabular-nums text-[var(--fg-muted)]">{fromAgent}</dd>
            </div>
          </dl>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/40 p-3.5 text-[13px]">
            <p className="flex items-center gap-1.5 text-[var(--fg-muted)]"><Clock size={13} /> Janela de resposta</p>
            <p className={cn("mt-1.5 text-xs", windowOpen ? "text-[var(--success)]" : "text-[var(--warn)]")}>
              {windowOpen && active.window_expires_at
                ? `Aberta até ${new Date(active.window_expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                : "Fechada — aguarde a pessoa escrever de novo."}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
