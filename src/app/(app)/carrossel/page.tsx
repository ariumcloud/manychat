"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";
import { timeAgo } from "@/lib/utils";

type Slide = {
  n: number;
  text: string;
  screenshot_hint: string;
  image_url?: string | null;
};

type Carousel = {
  id: string;
  title: string | null;
  brief: string;
  slides: Slide[];
  created_at: string;
  updated_at: string;
};

const EXEMPLO =
  "Perguntei pro ChatGPT quem é o melhor advogado de Natal. Rodei 10 vezes em janelas anônimas diferentes. Meu cliente apareceu 0 vezes — e três escritórios menores que o dele apareceram em todas. Descobri que o que decide não é o site, é quantas vezes o nome aparece citado em portais locais.";

export default function CarrosselPage() {
  const [list, setList] = useState<Carousel[]>([]);
  const [active, setActive] = useState<Carousel | null>(null);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [ready, setReady] = useState(true);
  const [slideCount, setSlideCount] = useState(8);
  const [range, setRange] = useState({ min: 4, max: 10 });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { ok, data, error: err } = await fetchJson<{
        carousels: Carousel[];
        provider: string;
        ready: boolean;
        slideRange: { min: number; max: number };
      }>("/api/carousels");
      if (cancelled) return;
      if (ok) {
        setList(data?.carousels ?? []);
        setProvider(data?.provider ?? null);
        setReady(data?.ready ?? false);
        if (data?.slideRange) setRange(data.slideRange);
      }
      setError(ok ? null : err);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  async function generate() {
    setGenerating(true);
    setError(null);

    const { ok, data, error: err } = await fetchJson<{ carousel: Carousel }>("/api/carousels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, slide_count: slideCount }),
    });

    if (ok && data) {
      setActive(data.carousel);
      setBrief("");
      setVersion((v) => v + 1);
    } else {
      setError(err ?? "Não consegui gerar o roteiro.");
    }
    setGenerating(false);
  }

  if (active) {
    return <Editor carousel={active} onBack={() => setActive(null)} />;
  }

  return (
    <>
      <PageHeader
        title="Carrosséis"
        subtitle="Descreva um teste que você fez de verdade. Eu escrevo os 8 slides e digo qual print capturar."
      />

      <div className="max-w-3xl space-y-6 p-8">
        {error && (
          <div className="card border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <section className="card p-5">
          <label className="label" htmlFor="brief">
            O que você testou?
          </label>
          <textarea
            id="brief"
            rows={6}
            className="input resize-none"
            placeholder={EXEMPLO}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />

          <div className="mt-4">
            <span className="label">Quantos slides</span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map((n) => (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  className={
                    "h-9 w-9 rounded-lg text-sm tabular-nums transition-colors " +
                    (slideCount === n
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg)] text-[var(--fg-muted)] hover:text-[var(--fg)]")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">
              Capa, prova e fechamento são fixos — o que muda é quantos passos cabem no meio.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              className="text-xs text-[var(--accent)] hover:underline"
              onClick={() => setBrief(EXEMPLO)}
            >
              usar o exemplo
            </button>
            <button
              className="btn btn-primary"
              onClick={generate}
              disabled={generating || !ready || brief.trim().length < 30}
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              {generating ? "escrevendo…" : "Gerar roteiro"}
            </button>
          </div>

          {!ready && (
            <p className="mt-3 text-xs text-[var(--warn)]">
              Falta a chave de API. Defina OPENAI_API_KEY (ou ANTHROPIC_API_KEY) no .env.local e
              nas variáveis da Vercel.
            </p>
          )}

          {provider && (
            <p className="mt-3 text-xs text-[var(--fg-dim)]">
              Escrevendo com <strong className="text-[var(--fg-muted)]">{provider}</strong>. Troque
              pela variável <code>AI_PROVIDER</code>.
            </p>
          )}

          <p className="mt-2 text-xs leading-relaxed text-[var(--fg-dim)]">
            Quanto mais específico o número, melhor o carrossel. &ldquo;Rodei 10 vezes, apareceu
            0&rdquo; funciona; &ldquo;testei e não deu certo&rdquo; não.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Seus carrosséis</h2>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
              <Loader2 size={15} className="animate-spin" /> carregando…
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-[var(--fg-dim)]">Nenhum ainda.</p>
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title ?? "sem título"}</p>
                    <p className="truncate text-xs text-[var(--fg-muted)]">
                      {c.slides.filter((s) => s.image_url).length}/{c.slides.length} prints
                    </p>
                  </div>
                  <span className="text-xs text-[var(--fg-dim)]">{timeAgo(c.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Editor({ carousel, onBack }: { carousel: Carousel; onBack: () => void }) {
  const [slides, setSlides] = useState<Slide[]>(carousel.slides);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Muda quando algo é salvo, para forçar o navegador a rebuscar os PNGs.
  const [stamp, setStamp] = useState(0);

  function patch(n: number, text: string) {
    setSlides((prev) => prev.map((s) => (s.n === n ? { ...s, text } : s)));
  }

  async function save() {
    setSaving(true);
    setError(null);

    const { ok, error: err } = await fetchJson(`/api/carousels/${carousel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides }),
    });

    if (!ok) setError(err ?? "Não consegui salvar.");
    else setStamp(Date.now());
    setSaving(false);
  }

  return (
    <>
      <PageHeader
        title={carousel.title ?? "Carrossel"}
        subtitle="Ajuste o texto, suba os prints e baixe o ZIP."
        action={
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onBack}>
              Voltar
            </button>
            <button className="btn btn-ghost" onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />} Salvar
            </button>
            <a className="btn btn-primary" href={`/api/carousels/${carousel.id}/zip`}>
              <Download size={15} /> Baixar ZIP
            </a>
          </div>
        }
      />

      <div className="p-8">
        {error && (
          <div className="card mb-5 border-[rgba(248,113,113,0.4)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {slides.map((slide) => (
            <SlideRow
              key={slide.n}
              carouselId={carousel.id}
              slide={slide}
              stamp={stamp}
              onText={(t) => patch(slide.n, t)}
              onUploaded={(url) =>
                setSlides((prev) =>
                  prev.map((s) => (s.n === slide.n ? { ...s, image_url: url } : s)),
                )
              }
            />
          ))}
        </div>
      </div>
    </>
  );
}

function SlideRow({
  carouselId,
  slide,
  stamp,
  onText,
  onUploaded,
}: {
  carouselId: string;
  slide: Slide;
  stamp: number;
  onText: (t: string) => void;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("n", String(slide.n));

    const res = await fetch(`/api/carousels/${carouselId}/upload`, {
      method: "POST",
      body: form,
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok) onUploaded(body.url);
    else setUploadError(body.error ?? "Falha no upload.");
    setUploading(false);
  }

  return (
    <div className="card flex gap-5 p-5">
      <div className="flex w-52 shrink-0 flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/carousels/${carouselId}/slide/${slide.n}?v=${stamp}`}
          alt={`Slide ${slide.n}`}
          className="w-full rounded-lg border border-[var(--border)] bg-white"
        />
        <span className="text-center text-[11px] text-[var(--fg-dim)]">slide {slide.n}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea
          rows={5}
          className="input resize-none"
          value={slide.text}
          onChange={(e) => onText(e.target.value)}
        />
        <p className="text-[11px] text-[var(--fg-dim)]">
          Use <code className="rounded bg-[var(--bg-elev-2)] px-1">**assim**</code> para o negrito
          nos números.
        </p>

        {slide.screenshot_hint && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--bg-elev-2)] p-3">
            <Camera size={14} className="mt-0.5 shrink-0 text-[var(--warn)]" />
            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
              {slide.screenshot_hint}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            {slide.image_url ? "Trocar print" : "Subir print"}
          </button>

          {slide.image_url && (
            <button
              className="btn btn-danger px-2"
              onClick={() => onUploaded("")}
              title="Remover print"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {uploadError && <p className="text-xs text-[var(--danger)]">{uploadError}</p>}
      </div>
    </div>
  );
}
