"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Play, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";

type TestResult = {
  id: string;
  permission: string;
  label: string;
  endpoint: string;
  ok: boolean;
  status: number;
  detail: string;
};

export default function TestesApiPage() {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);

    const { ok, data, error: err } = await fetchJson<{ results: TestResult[] }>("/api/meta-tests", {
      method: "POST",
    });

    if (ok) setResults(data?.results ?? []);
    else setError(err ?? "Não consegui rodar os testes.");
    setRunning(false);
  }

  async function runPublish() {
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    const { ok, data, error: err } = await fetchJson<{ detail: string; containerId: string }>(
      "/api/meta-tests/publish",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      },
    );

    if (ok) setPublishResult(data?.detail ?? "Container criado.");
    else setPublishError(err ?? "Falhou.");
    setPublishing(false);
  }

  const passed = results?.filter((r) => r.ok).length ?? 0;

  return (
    <>
      <PageHeader
        title="Testes de API"
        subtitle="O Meta exige ao menos 1 chamada por permissão antes de liberar o App Review."
        action={
          <button className="btn btn-primary" onClick={run} disabled={running}>
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            Rodar testes
          </button>
        }
      />

      <div className="max-w-3xl space-y-5 p-8">
        <div className="card p-5 text-sm leading-relaxed text-[var(--fg-muted)]">
          Estas chamadas são todas de <strong className="text-[var(--fg)]">leitura</strong> — não
          escrevem, não publicam e não mandam mensagem pra ninguém. Rode uma vez e o Meta registra
          as permissões. Os resultados podem levar até 24h pra aparecer no painel de App Review.
        </div>

        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {results && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-sm font-semibold">Resultado</h2>
              <span className={passed === results.length ? "chip chip-ok" : "chip chip-warn"}>
                {passed} de {results.length} passaram
              </span>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {results.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5">
                    {r.ok ? (
                      <Check size={16} className="text-[var(--success)]" />
                    ) : (
                      <X size={16} className="text-[var(--danger)]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-dim)]">
                      {r.endpoint}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--fg-muted)]">{r.detail}</p>
                    <p className="mt-1.5 flex flex-wrap gap-1">
                      {r.permission.split(" / ").map((p) => (
                        <span key={p} className="chip font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--warn)]" />
            <div>
              <h2 className="text-sm font-semibold">
                instagram_business_content_publish — separado de propósito
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
                Esta é a única permissão que não dá pra testar só lendo. A chamada cria um{" "}
                <em>container</em> de mídia a partir de uma imagem — mas{" "}
                <strong className="text-[var(--fg)]">não publica nada no seu perfil</strong>.
                Publicar exigiria uma segunda chamada que este botão não faz; o Instagram descarta o
                container sozinho em 24h.
              </p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Precisa de uma URL pública de imagem JPEG. Pode ser qualquer uma sua já hospedada.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="https://…/imagem.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <button
              className="btn btn-ghost"
              onClick={runPublish}
              disabled={publishing || !imageUrl.trim()}
            >
              {publishing && <Loader2 size={15} className="animate-spin" />}
              Criar container
            </button>
          </div>

          {publishResult && (
            <p className="mt-3 text-sm text-[var(--success)]">{publishResult}</p>
          )}
          {publishError && <p className="mt-3 text-sm text-[var(--danger)]">{publishError}</p>}
        </div>

        <div className="card p-5 text-sm leading-relaxed text-[var(--fg-muted)]">
          <h2 className="text-sm font-semibold text-[var(--fg)]">Human Agent</h2>
          <p className="mt-2">
            Não é uma permissão de leitura: só conta quando você responde uma DM real usando a tag
            de agente humano, dentro da janela de 7 dias. Assim que alguém te mandar uma mensagem,
            responda pelo <strong className="text-[var(--fg)]">Inbox</strong> e o Meta registra.
          </p>
        </div>
      </div>
    </>
  );
}
