"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";

type TokenStatus = {
  valid: boolean;
  username?: string;
  userId?: string;
  error?: string;
};

type RefreshResult = {
  expiresAt: string;
  days: number;
  permissions: string[];
};

type Billing = {
  ready: boolean;
  plan: string | null;
  planName: string | null;
  status: string | null;
  periodEnd: string | null;
  used: number;
  limit: number | null;
  available: Array<{ slug: string; name: string; price: string }>;
};

type AccountInfo = {
  config: Record<string, boolean>;
  account: {
    ig_user_id: string;
    username: string | null;
    name: string | null;
    followers_count: number | null;
  } | null;
  role: "admin" | "client" | null;
  billing: Billing;
  connected: boolean;
  token: TokenStatus | null;
  meta: { flavor: string; version: string; base: string };
  webhookUrl: string;
};

const CONFIG_LABELS: Record<string, string> = {
  supabase: "Supabase (URL + service_role key)",
  meta: "App do Meta (APP_ID + APP_SECRET)",
  token: "Token de acesso do Instagram",
  verifyToken: "Verify token do webhook",
  auth: "Senha do painel + AUTH_SECRET",
  oauth: "Conectar Instagram por OAuth (APP_ID + APP_SECRET)",
};

/** Mensagem para o ?ig=… que o callback do OAuth devolve. */
const IG_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Instagram conectado. As automações já podem rodar nesta conta." },
  "ok-sem-webhook": {
    ok: false,
    text: "Instagram conectado, mas não consegui ligar o webhook dele. Toque em Conectar de novo; se persistir, confira os campos do webhook no app da Meta.",
  },
  negado: { ok: false, text: "A autorização foi negada no Instagram." },
  invalido: { ok: false, text: "A conexão expirou ou não confere com o painel aberto. Tente de novo." },
  "em-uso": { ok: false, text: "Esse Instagram já está conectado a outro painel." },
  erro: {
    ok: false,
    text: "Não consegui concluir a conexão. Confirme que a conta é Business/Creator e que você aceitou o convite de testador do app.",
  },
};

/** Mensagem para o ?assinatura=… que o checkout da Stripe devolve. */
const BILLING_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Pagamento recebido! Sua assinatura aparece aqui em instantes." },
  cancelada: { ok: false, text: "O pagamento foi cancelado. Você pode escolher um plano quando quiser." },
  "ja-ativa": { ok: false, text: "Você já tem uma assinatura. Para trocar de plano, use Gerenciar assinatura." },
  "plano-invalido": { ok: false, text: "Esse plano não existe." },
  indisponivel: { ok: false, text: "As assinaturas ainda não estão disponíveis. Tente mais tarde." },
  erro: { ok: false, text: "Não consegui abrir o pagamento. Tente de novo." },
};

const STATUS_LABELS: Record<string, { label: string; ok: boolean }> = {
  active: { label: "ativa", ok: true },
  trialing: { label: "em teste", ok: true },
  past_due: { label: "pagamento pendente", ok: false },
  canceled: { label: "cancelada", ok: false },
  unpaid: { label: "não paga", ok: false },
  incomplete: { label: "aguardando pagamento", ok: false },
  incomplete_expired: { label: "expirada", ok: false },
};

function BillingSection({ billing }: { billing: Billing }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setOpening(true);
    setError(null);
    const { ok, data, error: err } = await fetchJson<{ url: string }>("/api/stripe/portal", {
      method: "POST",
    });
    if (ok && data) {
      window.location.assign(data.url);
      return;
    }
    setError(err ?? "Não consegui abrir o portal.");
    setOpening(false);
  }

  if (!billing.plan) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Assinatura</h2>
        {billing.ready && billing.available.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Escolha um plano para ativar suas automações.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {billing.available.map((p) => (
                <a key={p.slug} href={`/api/stripe/checkout?plan=${p.slug}`} className="btn btn-ghost">
                  {p.name} · R$ {p.price}/mês
                </a>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">As assinaturas ainda não estão disponíveis.</p>
        )}
      </section>
    );
  }

  const status = STATUS_LABELS[billing.status ?? ""] ?? { label: billing.status ?? "—", ok: false };
  const pct = billing.limit ? Math.min(100, Math.round((billing.used / billing.limit) * 100)) : 0;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">
            Assinatura · {billing.planName}{" "}
            <span className={`chip ml-1 ${status.ok ? "chip-ok" : "chip-danger"}`}>{status.label}</span>
          </h2>
          {billing.periodEnd && (
            <p className="mt-1 text-xs text-[var(--fg-dim)]">
              Próxima renovação em {new Date(billing.periodEnd).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <button className="btn btn-ghost shrink-0" onClick={openPortal} disabled={opening}>
          {opening && <Loader2 size={14} className="animate-spin" />}
          Gerenciar assinatura
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-[var(--fg-muted)]">Mensagens neste mês</span>
          <span>
            <strong>{billing.used.toLocaleString("pt-BR")}</strong>
            {billing.limit ? ` de ${billing.limit.toLocaleString("pt-BR")}` : " · sem limite"}
          </span>
        </div>
        {billing.limit && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: pct >= 90 ? "var(--danger)" : "var(--brand)",
              }}
            />
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </section>
  );
}

type ClientRow = {
  id: string;
  login: string | null;
  username: string | null;
  name: string | null;
  connected: boolean;
};

/** Só o dono: cria o painel de um cliente e abre o painel de outra conta. */
function ClientsPanel() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ClientRow[]>([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await fetchJson<{ accounts: ClientRow[] }>("/api/admin/clients");
      if (!cancelled && data) setAccounts(data.accounts);
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { ok, error } = await fetchJson("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setBusy(false);
    if (!ok) return setMessage({ ok: false, text: error ?? "Não consegui criar." });
    setMessage({
      ok: true,
      text: `Painel criado. Passe para o cliente o login "${login.trim().toLowerCase()}" e a senha; ele entra e toca em Conectar Instagram.`,
    });
    setLogin("");
    setPassword("");
    setVersion((v) => v + 1);
  }

  async function open(accountId: string) {
    const { ok, error } = await fetchJson("/api/admin/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    if (!ok) return setMessage({ ok: false, text: error ?? "Não consegui trocar." });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">Clientes</h2>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Cada cliente tem login e senha próprios e só enxerga a própria conta.
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)] text-sm">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <span className="font-medium">
                {a.username ? `@${a.username}` : (a.name ?? "Instagram ainda não conectado")}
              </span>
              <span className="ml-2 text-xs text-[var(--fg-dim)]">
                {a.login ? `login: ${a.login}` : "conta do dono"}
              </span>
              {!a.connected && <span className="chip chip-warn ml-2">aguardando conexão</span>}
            </div>
            <button className="btn btn-ghost" onClick={() => open(a.id)}>
              Abrir painel
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="input"
          placeholder="e-mail ou login do cliente"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="off"
        />
        <input
          className="input"
          type="text"
          placeholder="senha (8+ caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
        />
        <button className="btn btn-primary" disabled={busy || !login || password.length < 8}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Criar cliente
        </button>
      </form>
      {message && (
        <p className={`text-sm ${message.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input readOnly value={value} className="input font-mono text-xs" />
        <button
          className="btn btn-ghost"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function ConfiguracoesContent() {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState<RefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // Volta do OAuth: o callback redireciona para /configuracoes?ig=<resultado>.
  const igStatus = useSearchParams().get("ig");
  const igResult = igStatus ? (IG_MESSAGES[igStatus] ?? IG_MESSAGES.erro) : null;
  const billingStatus = useSearchParams().get("assinatura");
  const billingResult = billingStatus ? (BILLING_MESSAGES[billingStatus] ?? BILLING_MESSAGES.erro) : null;
  // Incrementar isto recarrega o diagnóstico.
  const [version, setVersion] = useState(0);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data, error: err } = await fetchJson<AccountInfo>("/api/account");
      if (cancelled) return;
      setInfo(data);
      setLoadError(err);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  async function refreshToken() {
    setRefreshing(true);
    setRefreshError(null);
    setRefreshed(null);

    const { ok, data, error: err } = await fetchJson<RefreshResult>("/api/account/refresh-token", {
      method: "POST",
    });

    if (ok && data) setRefreshed(data);
    else setRefreshError(err ?? "Não consegui renovar.");
    setRefreshing(false);
  }

  async function connect() {
    setConnecting(true);
    setError(null);
    const { ok, error: err } = await fetchJson("/api/account", { method: "POST" });
    if (!ok) setError(err ?? "Falhou.");
    setConnecting(false);
    reload();
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Configurações" />
        <div className="flex items-center gap-2 p-8 text-sm text-[var(--fg-muted)]">
          <Loader2 size={15} className="animate-spin" /> carregando…
        </div>
      </>
    );
  }

  const token = info?.token;

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Conexão com o Meta, webhook e diagnóstico do token."
        action={
          <button className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> Atualizar
          </button>
        }
      />

      <div className="mx-auto grid w-full max-w-[1440px] items-start gap-4 px-6 py-5 xl:grid-cols-2">
        {igResult && (
          <div
            className={`card p-4 text-sm xl:col-span-2 ${igResult.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          >
            {igResult.text}
          </div>
        )}

        {billingResult && (
          <div
            className={`card p-4 text-sm ${billingResult.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          >
            {billingResult.text}
          </div>
        )}

        {loadError && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)] xl:col-span-2">
            {loadError}
          </div>
        )}

        {info?.role === "admin" && (
          <div className="xl:col-span-2">
            <ClientsPanel />
          </div>
        )}

        {info?.role === "admin" && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">O que já está configurado</h2>
          <ul className="mt-4 space-y-2">
            {Object.entries(info?.config ?? {}).map(([key, ok]) => (
              <li key={key} className="flex items-center gap-2.5 text-sm">
                {ok ? (
                  <Check size={15} className="text-[var(--success)]" />
                ) : (
                  <X size={15} className="text-[var(--danger)]" />
                )}
                <span className={ok ? "" : "text-[var(--fg-muted)]"}>
                  {CONFIG_LABELS[key] ?? key}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--fg-dim)]">
            Tudo isso vem do arquivo <code className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5">.env.local</code>{" "}
            na raiz do projeto (e das Environment Variables na Vercel, em produção).
          </p>
        </section>
        )}

        {info?.role === "admin" && (
        <section className="card space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Webhook</h2>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Cole estes dois valores no painel do Meta, em Webhooks → Instagram.
            </p>
          </div>
          <CopyField label="Callback URL" value={info?.webhookUrl ?? ""} />
          <p className="text-xs text-[var(--fg-dim)]">
            O <strong>Verify Token</strong> é o valor de <code>META_VERIFY_TOKEN</code> no seu .env —
            digite exatamente o mesmo lá no Meta. Assine os campos{" "}
            <code>messages</code>, <code>messaging_postbacks</code> e <code>comments</code>.
          </p>
        </section>
        )}

        {info && (info.role === "client" || info.billing.plan) && <BillingSection billing={info.billing} />}

        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Conta conectada</h2>
              {info?.connected && info.account ? (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  @{info.account.username ?? "—"} · {info.account.followers_count ?? 0} seguidores ·{" "}
                  <span className="font-mono text-xs">{info.account.ig_user_id}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  Nenhum Instagram conectado. Toque em Conectar e autorize a conta.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {info?.connected && (
                <button className="btn btn-ghost" onClick={connect} disabled={connecting}>
                  {connecting && <Loader2 size={14} className="animate-spin" />}
                  Atualizar perfil
                </button>
              )}
              {/* Navegação completa: o Instagram precisa abrir na janela inteira. */}
              <a className="btn btn-primary" href="/api/instagram/connect">
                {info?.connected ? "Reconectar Instagram" : "Conectar Instagram"}
              </a>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold">Token</h2>

          <dl className="mt-4 grid grid-cols-[130px_1fr] gap-y-2.5 text-sm">
            <dt className="text-[var(--fg-muted)]">Status</dt>
            <dd>
              {token?.valid ? (
                <span className="chip chip-ok">funcionando</span>
              ) : (
                <span className="chip chip-danger">inválido</span>
              )}
            </dd>

            <dt className="text-[var(--fg-muted)]">Conta</dt>
            <dd>{token?.username ? `@${token.username}` : "—"}</dd>
          </dl>

          {token && !token.valid && token.error && (
            <p className="mt-3 text-sm text-[var(--danger)]">{token.error}</p>
          )}

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
              Tokens do Instagram expiram em <strong className="text-[var(--fg)]">60 dias</strong>. O
              app renova sozinho toda segunda-feira; o botão renova agora e mostra validade e
              permissões (o <code>debug_token</code> do Facebook não funciona com Instagram Login).
            </p>

            <button className="btn btn-ghost mt-3" onClick={refreshToken} disabled={refreshing}>
              {refreshing && <Loader2 size={14} className="animate-spin" />}
              Renovar token
            </button>

            {refreshError && (
              <p className="mt-3 text-sm text-[var(--danger)]">{refreshError}</p>
            )}

            {refreshed && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--success)]">
                  Renovado. Válido por mais {refreshed.days} dias (até{" "}
                  {new Date(refreshed.expiresAt).toLocaleDateString("pt-BR")}).
                </p>

                <div>
                  <span className="label">Permissões concedidas</span>
                  <div className="flex flex-wrap gap-1">
                    {refreshed.permissions.map((p) => (
                      <span key={p} className="chip font-mono text-[10px]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[var(--fg-dim)]">
                  O token novo já está salvo e em uso. Não precisa colar nada na Vercel.
                </p>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-[var(--fg-dim)]">
            API em uso: <code>{info?.meta.base}</code> (sabor{" "}
            <strong>{info?.meta.flavor}</strong>). Se as chamadas derem 400, troque{" "}
            <code>META_API_FLAVOR</code> entre <code>instagram</code> e <code>facebook</code>.
          </p>
        </section>
      </div>
    </>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense>
      <ConfiguracoesContent />
    </Suspense>
  );
}
