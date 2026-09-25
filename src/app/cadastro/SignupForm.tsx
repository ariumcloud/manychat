"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function SignupForm({ needsCode, plan }: { needsCode: boolean; plan: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, code }),
    });

    if (res.ok) {
      if (plan) {
        // Veio de um plano: segue direto para o pagamento. E rota de API que
        // redireciona para a Stripe, entao precisa de navegacao completa.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- rota de API que sai do app
        window.location.assign(`/api/stripe/checkout?plan=${encodeURIComponent(plan)}`);
        return;
      }
      // Conta nova: o primeiro passo e conectar o Instagram.
      router.push("/configuracoes");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não consegui criar a conta.");
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
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Criar sua conta</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Depois de entrar, você conecta o seu Instagram.
        </p>
      </div>

      <label className="label" htmlFor="email">
        E-mail
      </label>
      <input
        id="email"
        type="email"
        autoFocus
        autoComplete="email"
        className="input mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@email.com"
      />

      <label className="label" htmlFor="password">
        Senha
      </label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        className="input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="mínimo 8 caracteres"
      />

      {needsCode && (
        <>
          <label className="label mt-4" htmlFor="code">
            Código de convite
          </label>
          <input
            id="code"
            type="text"
            autoComplete="off"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="o código que você recebeu"
          />
        </>
      )}

      {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={loading || !email || password.length < 8 || (needsCode && !code)}
        className="btn btn-primary mt-5 w-full"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        Criar conta
      </button>

      <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
        Já tem conta?{" "}
        <Link
          href={plan ? `/login?next=${encodeURIComponent(`/api/stripe/checkout?plan=${plan}`)}` : "/login"}
          className="text-[var(--accent)] hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
