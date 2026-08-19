"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Inbox as InboxIcon, Loader2, Send, User } from "lucide-react";
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

  return (
    <div className="flex h-screen">
      <div className="flex w-80 shrink-0 flex-col border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-[21px]">
          <h1 className="text-sm font-semibold">Inbox</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-[var(--fg-muted)]">
              <Loader2 size={15} className="animate-spin" /> carregando…
            </div>
          ) : listError ? (
            <p className="p-5 text-sm text-[var(--danger)]">{listError}</p>
          ) : conversations.length === 0 ? (
            <p className="p-5 text-sm text-[var(--fg-dim)]">
              Nenhuma conversa ainda. Elas aparecem quando alguém te manda DM.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors",
                  activeId === c.id ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-elev)]",
                )}
              >
                {c.contacts?.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.contacts.profile_picture_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--bg-elev-2)] text-[var(--fg-dim)]">
                    <User size={16} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.contacts?.username ? `@${c.contacts.username}` : (c.contacts?.name ?? "contato")}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] text-[var(--fg-dim)]">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--fg-muted)]">
                    {c.last_message_preview ?? "—"}
                  </p>
                </div>

                {c.unread_count > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-medium text-white">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <InboxIcon size={26} className="mx-auto text-[var(--fg-dim)]" />
              <p className="mt-3 text-sm text-[var(--fg-dim)]">Escolha uma conversa à esquerda.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
              <span className="text-sm font-medium">
                {active.contacts?.username ? `@${active.contacts.username}` : "contato"}
              </span>
              <span className={windowOpen ? "chip chip-ok" : "chip chip-warn"}>
                {windowOpen ? "janela de 24h aberta" : "janela fechada"}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[65%] rounded-2xl px-3.5 py-2 text-sm",
                      m.direction === "out"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elev-2)] text-[var(--fg)]",
                      m.status === "failed" && "opacity-60 ring-1 ring-[var(--danger)]",
                    )}
                  >
                    {m.sender === "bot" && (
                      <span className="mb-1 flex items-center gap-1 text-[11px] opacity-80">
                        <Bot size={11} /> automático
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.text ?? `[${m.type}]`}</p>
                    <span className="mt-1 block text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </span>
                    {m.error && <p className="mt-1 text-[11px] text-[var(--danger)]">{m.error}</p>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-[var(--border)] px-6 py-4">
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
                <button
                  className="btn btn-primary"
                  onClick={send}
                  disabled={sending || !windowOpen || !draft.trim()}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
