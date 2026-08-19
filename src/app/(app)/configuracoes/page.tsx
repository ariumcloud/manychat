"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";

type TokenStatus = {
  valid: boolean;
  username?: string;
  userId?: string;
  error?: string;
};

type RefreshResult = {
  accessToken: string;
  expiresAt: string;
  days: number;
  permissions: string[];
};

type AccountInfo = {
  config: Record<string, boolean>;
  account: {
    ig_user_id: string;
    username: string | null;
    name: string | null;
    followers_count: number | null;
  } | null;
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
};

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

export default function ConfiguracoesPage() {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState<RefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
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

      <div className="max-w-3xl space-y-5 p-8">
        {loadError && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {loadError}
          </div>
        )}

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

        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Conta conectada</h2>
              {info?.account ? (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  @{info.account.username ?? "—"} · {info.account.followers_count ?? 0} seguidores ·{" "}
                  <span className="font-mono text-xs">{info.account.ig_user_id}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">Nenhuma conta gravada ainda.</p>
              )}
            </div>
            <button className="btn btn-primary" onClick={connect} disabled={connecting}>
              {connecting && <Loader2 size={14} className="animate-spin" />}
              {info?.account ? "Reconectar" : "Conectar"}
            </button>
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
              Tokens do Instagram expiram em <strong className="text-[var(--fg)]">60 dias</strong>.
              Renovar devolve um token novo — e é a única forma de ver validade e permissões, já que
              o <code>debug_token</code> do Facebook não funciona com Instagram Login.
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

                <div>
                  <span className="label">Token novo</span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      type={showToken ? "text" : "password"}
                      value={refreshed.accessToken}
                      className="input font-mono text-xs"
                    />
                    <button className="btn btn-ghost" onClick={() => setShowToken((v) => !v)}>
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => void navigator.clipboard.writeText(refreshed.accessToken)}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--warn)]">
                    Cole em <code>IG_ACCESS_TOKEN</code> no <code>.env.local</code> e nas
                    Environment Variables da Vercel, depois redeploy. O token antigo continua
                    valendo até a data original.
                  </p>
                </div>
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
