"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AtSign,
  Loader2,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetchJson";

type Trigger = {
  id: string;
  kind: string;
  keywords: string[];
  match_type: string;
  media_id: string | null;
  enabled: boolean;
  public_reply_enabled: boolean;
  public_reply_texts: string[];
  only_first_time: boolean;
  flows: { id: string; name: string; status: string } | null;
};

type Media = { id: string; caption?: string; thumbnail_url?: string; media_url?: string; permalink?: string };

const KIND_LABEL: Record<string, string> = {
  comment_keyword: "Comentário → DM",
  dm_keyword: "Palavra-chave na DM",
  story_reply: "Resposta de story",
  default_reply: "Resposta padrão",
};

export default function AutomacoesPage() {
  return (
    <Suspense>
      <Automacoes />
    </Suspense>
  );
}

function Automacoes() {
  // A tela de Reels manda ?media=<id> pra já abrir o formulário naquele post.
  const mediaFromUrl = useSearchParams().get("media");

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(Boolean(mediaFromUrl));
  const [error, setError] = useState<string | null>(null);
  // Incrementar isto refaz a busca — evita um load() solto que o React
  // reclamaria de chamar dentro do efeito.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { ok, data, error } = await fetchJson<{ triggers: Trigger[] }>("/api/triggers");
      if (cancelled) return;
      if (ok) setTriggers(data?.triggers ?? []);
      setError(ok ? null : error);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  // Atualiza na hora e desfaz se o servidor recusar — senão o botão mente
  // sobre o estado real da automação.
  async function toggle(t: Trigger) {
    const next = !t.enabled;
    setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: next } : x)));

    const { ok, error: err } = await fetchJson(`/api/triggers/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });

    if (!ok) {
      setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !next } : x)));
      setError(err ?? "Não consegui mudar o estado da automação.");
    }
  }

  async function remove(t: Trigger) {
    if (!confirm("Apagar esta automação? O fluxo dela continua salvo em Fluxos.")) return;

    const snapshot = triggers;
    setTriggers((prev) => prev.filter((x) => x.id !== t.id));

    const { ok, error: err } = await fetchJson(`/api/triggers/${t.id}`, { method: "DELETE" });
    if (!ok) {
      setTriggers(snapshot);
      setError(err ?? "Não consegui apagar.");
    }
  }

  return (
    <>
      <PageHeader
        title="Automações"
        subtitle="Regras que disparam sozinhas quando alguém comenta ou manda DM."
        action={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> Nova automação
          </button>
        }
      />

      <div className="p-8">
        {error && (
          <div className="card mb-5 border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={15} className="animate-spin" /> carregando…
          </div>
        ) : triggers.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="space-y-3">
            {triggers.map((t) => (
              <TriggerCard key={t.id} trigger={t} onToggle={toggle} onRemove={remove} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateDrawer
          initialMediaId={mediaFromUrl}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Sparkles size={19} />
      </div>
      <h2 className="mt-4 text-sm font-semibold">Nenhuma automação ainda</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
        A clássica: alguém comenta <strong className="text-[var(--fg)]">EU QUERO</strong> no seu post
        e recebe uma DM automática com o link. Leva uns 30 segundos pra montar.
      </p>
      <button className="btn btn-primary mx-auto mt-5" onClick={onCreate}>
        <Plus size={15} /> Criar a primeira
      </button>
    </div>
  );
}

function TriggerCard({
  trigger,
  onToggle,
  onRemove,
}: {
  trigger: Trigger;
  onToggle: (t: Trigger) => void;
  onRemove: (t: Trigger) => void;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
          trigger.kind === "comment_keyword"
            ? "bg-[rgba(52,211,153,0.12)] text-[var(--success)]"
            : "bg-[var(--accent-soft)] text-[var(--accent)]",
        )}
      >
        {trigger.kind === "comment_keyword" ? <MessageCircle size={17} /> : <AtSign size={17} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{trigger.flows?.name ?? "Sem fluxo"}</span>
          <span className="chip">{KIND_LABEL[trigger.kind] ?? trigger.kind}</span>
          {trigger.media_id ? (
            <span className="chip">post específico</span>
          ) : (
            <span className="chip">qualquer post</span>
          )}
          {trigger.public_reply_enabled && <span className="chip">responde no comentário</span>}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          {trigger.match_type === "any" ? (
            <span className="italic">qualquer texto</span>
          ) : (
            trigger.keywords.map((k) => (
              <code
                key={k}
                className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg)]"
              >
                {k}
              </code>
            ))
          )}
        </p>
      </div>

      {trigger.flows && (
        <Link
          href={`/fluxos/${trigger.flows.id}`}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          editar fluxo
        </Link>
      )}

      <button
        onClick={() => onToggle(trigger)}
        role="switch"
        aria-checked={trigger.enabled}
        aria-label={trigger.enabled ? "Desligar automação" : "Ligar automação"}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          trigger.enabled ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            trigger.enabled ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>

      <button onClick={() => onRemove(trigger)} className="btn btn-danger px-2" aria-label="Apagar">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function CreateDrawer({
  onClose,
  onCreated,
  initialMediaId,
}: {
  onClose: () => void;
  onCreated: () => void;
  initialMediaId?: string | null;
}) {
  const [kind, setKind] = useState("comment_keyword");
  const [keywords, setKeywords] = useState("");
  const [matchType, setMatchType] = useState("contains");
  const [dmText, setDmText] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [publicReply, setPublicReply] = useState(true);
  const [publicReplyText, setPublicReplyText] = useState("Te mandei no direct! 📩");
  const [onlyFirstTime, setOnlyFirstTime] = useState(false);
  const [followGate, setFollowGate] = useState(false);
  const [gateText, setGateText] = useState(
    "Opa! Antes de te mandar, me segue aqui 👉 é rapidinho.\n\nDepois toca no botão abaixo que eu te envio na hora 👇",
  );
  const [gateButton, setGateButton] = useState("JÁ TE SEGUI ✅");
  const [mediaId, setMediaId] = useState(initialMediaId ?? "");
  const [media, setMedia] = useState<Media[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await fetchJson<{ media: Media[] }>("/api/media");
      if (!cancelled) setMedia(data?.media ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);

    const { ok, error: err } = await fetchJson("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        match_type: matchType,
        media_id: mediaId || null,
        dm_text: dmText,
        button_label: buttonLabel,
        button_url: buttonUrl,
        public_reply_enabled: kind === "comment_keyword" && publicReply,
        public_reply_texts: publicReplyText.split("\n").map((t) => t.trim()).filter(Boolean),
        only_first_time: onlyFirstTime,
        follow_gate_enabled: followGate,
        follow_gate_text: gateText,
        follow_gate_button: gateButton,
      }),
    });

    if (ok) onCreated();
    else {
      setError(err ?? "Não consegui salvar.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-[var(--bg-elev)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-sm font-semibold">Nova automação</h2>
          <button onClick={onClose} className="text-[var(--fg-dim)] hover:text-[var(--fg)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div>
            <span className="label">Quando acontecer</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "comment_keyword", l: "Comentário no post" },
                { v: "dm_keyword", l: "Palavra-chave na DM" },
                { v: "story_reply", l: "Resposta de story" },
                { v: "default_reply", l: "Qualquer DM nova" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setKind(o.v)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    kind === o.v
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]",
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {kind !== "default_reply" && (
            <>
              <div>
                <label className="label" htmlFor="keywords">
                  Palavras-chave (separe por vírgula)
                </label>
                <input
                  id="keywords"
                  className="input"
                  placeholder="eu quero, quero, preço, link"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-[var(--fg-dim)]">
                  Acentos e maiúsculas não importam — &ldquo;Preço&rdquo; casa com &ldquo;preco&rdquo;.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="match">
                  Como comparar
                </label>
                <select
                  id="match"
                  className="input"
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                >
                  <option value="contains">Contém a palavra</option>
                  <option value="exact">É exatamente o texto</option>
                  <option value="any">Qualquer texto (sem filtro)</option>
                </select>
              </div>
            </>
          )}

          {kind === "comment_keyword" && (
            <div>
              <label className="label" htmlFor="media">
                Em qual post
              </label>
              <select
                id="media"
                className="input"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
              >
                <option value="">Qualquer post</option>
                {media.map((m) => (
                  <option key={m.id} value={m.id}>
                    {(m.caption ?? "sem legenda").slice(0, 70)}
                  </option>
                ))}
              </select>
              {media.length === 0 && (
                <p className="mt-1.5 text-xs text-[var(--fg-dim)]">
                  Não consegui listar seus posts — confira o token em Configurações. A regra vale para
                  qualquer post enquanto isso.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="dm">
              {followGate ? "Mensagem para quem JÁ te segue (o conteúdo)" : "Mensagem enviada na DM"}
            </label>
            <textarea
              id="dm"
              rows={4}
              className="input resize-none"
              placeholder={"Oi! Aqui está o link que você pediu 👇\nQualquer dúvida é só responder aqui."}
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
            />
          </div>

          <div className="card space-y-3 p-4">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={followGate}
                onChange={(e) => setFollowGate(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <UserPlus size={15} className="text-[var(--accent)]" />
              Só entregar para quem me segue
            </label>

            {!followGate ? (
              <p className="text-xs text-[var(--fg-dim)]">
                Ligando isso, quem não te segue recebe um pedido para seguir e um botão para
                destravar o conteúdo.
              </p>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="gate-text">
                    Mensagem para quem NÃO te segue
                  </label>
                  <textarea
                    id="gate-text"
                    rows={4}
                    className="input resize-none"
                    value={gateText}
                    onChange={(e) => setGateText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="gate-btn">
                    Botão para destravar (máx. 20 caracteres)
                  </label>
                  <input
                    id="gate-btn"
                    className="input"
                    maxLength={20}
                    value={gateButton}
                    onChange={(e) => setGateButton(e.target.value)}
                  />
                </div>

                <p className="text-xs leading-relaxed text-[var(--fg-dim)]">
                  A checagem é o primeiro passo: quem já te segue recebe o conteúdo direto, quem não
                  segue recebe o pedido — nada de mensagem antes disso.
                  <br />
                  <br />
                  Duas regras do Instagram mandam aqui. Num <strong>comentário</strong> você tem
                  direito a <strong>uma única mensagem</strong> até a pessoa responder — por isso o
                  link vai dentro do texto e o botão vai como resposta rápida, tudo junto. E o
                  &ldquo;essa pessoa te segue?&rdquo; só é respondido depois que existe uma conversa,
                  então no primeiro contato o portão começa fechado: quem já te seguia recebe o
                  pedido, toca no botão e o conteúdo vai na hora.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="btnLabel">
                Botão (opcional)
              </label>
              <input
                id="btnLabel"
                className="input"
                placeholder="Ver agora"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="btnUrl">
                Link do botão
              </label>
              <input
                id="btnUrl"
                className="input"
                placeholder="https://…"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
              />
            </div>
          </div>

          {kind === "comment_keyword" && (
            <div className="card space-y-3 p-4">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={publicReply}
                  onChange={(e) => setPublicReply(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Responder também no comentário
              </label>
              {publicReply && (
                <>
                  <textarea
                    rows={3}
                    className="input resize-none font-mono text-xs"
                    value={publicReplyText}
                    onChange={(e) => setPublicReplyText(e.target.value)}
                  />
                  <p className="text-xs text-[var(--fg-dim)]">
                    Uma variação por linha — sorteio a cada disparo pra não parecer robô.
                  </p>
                </>
              )}
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={onlyFirstTime}
              onChange={(e) => setOnlyFirstTime(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Só na primeira vez por pessoa
          </label>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Criar e publicar
          </button>
        </div>
      </div>
    </div>
  );
}
