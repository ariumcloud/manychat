"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if (res.ok) {
      const next = params.get("next") || "/dashboard";
      // Rotas de API (ex.: checkout da Stripe) redirecionam para fora do app:
      // precisam de navegacao completa, o roteador do Next nao segue.
      if (next.startsWith("/api/")) {
        window.location.assign(next);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não consegui entrar.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card rise w-full max-w-sm p-7">
      <div className="mb-6">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl text-lg font-bold text-white"
          style={{
            background: "var(--brand)",
            boxShadow: "0 10px 30px -10px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          F
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Entrar no painel</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          <Lock size={12} /> Use o e-mail (ou login) e a senha que você recebeu
        </p>
      </div>

      <label className="label" htmlFor="login">
        E-mail ou login
      </label>
      <input
        id="login"
        type="text"
        autoFocus
        autoComplete="username"
        className="input mb-4"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        placeholder="voce@email.com"
      />

      <label className="label" htmlFor="password">
        Senha
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        className="input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}

      <button type="submit" disabled={loading || !password} className="btn btn-primary mt-5 w-full">
        {loading && <Loader2 size={15} className="animate-spin" />}
        Entrar
      </button>

      <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-[var(--accent)] hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      {/* Aurora de fundo: é o primeiro quadro que alguém vê do painel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 8%, rgba(124,92,255,0.16), transparent 70%)," +
            "radial-gradient(38% 38% at 82% 88%, rgba(249,87,142,0.1), transparent 70%)," +
            "radial-gradient(38% 38% at 14% 82%, rgba(91,107,255,0.1), transparent 70%)",
        }}
      />
      <div className="relative">
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-[var(--fg-dim)]">
          Fluxo · Instagram no automático
        </p>
      </div>
    </main>
  );
}
