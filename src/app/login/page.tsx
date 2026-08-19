"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não consegui entrar.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Lock size={18} />
        </div>
        <div>
          <h1 className="text-base font-semibold">Entrar no painel</h1>
          <p className="text-xs text-[var(--fg-muted)]">A senha está no seu .env.local</p>
        </div>
      </div>

      <label className="label" htmlFor="password">
        Senha
      </label>
      <input
        id="password"
        type="password"
        autoFocus
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
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
