"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { fetchJson } from "@/lib/fetchJson";
import { CATALOG_LIMITS, type CatalogAction, type CatalogItem } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Draft = {
  image_url: string;
  title: string;
  subtitle: string;
  button_label: string;
  button_action: CatalogAction;
  button_url: string;
};

const EMPTY: Draft = {
  image_url: "",
  title: "",
  subtitle: "",
  button_label: "Ver produto",
  button_action: "url",
  button_url: "",
};

function toDraft(item: CatalogItem): Draft {
  return {
    image_url: item.image_url,
    title: item.title,
    subtitle: item.subtitle ?? "",
    button_label: item.button_label,
    button_action: item.button_action,
    button_url: item.button_url ?? "",
  };
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // null = formulario fechado; "new" = criando; id = editando.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchJson<{ items: CatalogItem[] }>("/api/catalog").then(({ ok, data, error }) => {
      if (ok) setItems(data?.items ?? []);
      else setListError(error);
      setLoading(false);
    });
  }, []);

  function open(item?: CatalogItem) {
    setEditing(item?.id ?? "new");
    setDraft(item ? toDraft(item) : EMPTY);
    setFormError(null);
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function upload(file: File) {
    setUploading(true);
    setFormError(null);
    const form = new FormData();
    form.append("file", file);
    const { ok, data, error } = await fetchJson<{ url: string }>("/api/catalog/upload", {
      method: "POST",
      body: form,
    });
    if (ok && data) set("image_url", data.url);
    else setFormError(error);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    const isNew = editing === "new";
    const { ok, data, error } = await fetchJson<{ item: CatalogItem }>(
      isNew ? "/api/catalog" : `/api/catalog/${editing}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    setSaving(false);
    if (!ok || !data) {
      setFormError(error);
      return;
    }
    setItems((prev) =>
      isNew ? [data.item, ...prev] : prev.map((i) => (i.id === data.item.id ? data.item : i)),
    );
    setEditing(null);
  }

  async function remove(item: CatalogItem) {
    if (!confirm(`Apagar "${item.title}" do catálogo?`)) return;
    const { ok, error } = await fetchJson(`/api/catalog/${item.id}`, { method: "DELETE" });
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (editing === item.id) setEditing(null);
    } else {
      alert(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle="Cards reaproveitáveis do bloco Carrossel dos fluxos."
        action={
          <button className="btn btn-primary" onClick={() => open()}>
            <Plus size={14} /> Novo item
          </button>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_360px]">
        <section>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-[var(--fg-dim)]">
              <Loader2 size={14} className="animate-spin" /> Carregando…
            </p>
          ) : listError ? (
            <p className="text-sm text-[var(--danger)]">{listError}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--fg-dim)]">
              Nenhum item ainda. Crie o primeiro para usar no bloco Carrossel.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "card overflow-hidden",
                    editing === item.id && "border-[var(--accent)]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt=""
                    className="aspect-[1.91/1] w-full bg-[var(--bg-elev-2)] object-cover"
                  />
                  <div className="space-y-1 p-3">
                    <h3 className="truncate text-sm font-medium">{item.title}</h3>
                    {item.subtitle && (
                      <p className="line-clamp-2 text-xs text-[var(--fg-muted)]">{item.subtitle}</p>
                    )}
                    <p className="truncate pt-1 text-[11px] text-[var(--fg-dim)]">
                      {item.button_action === "flow"
                        ? `“${item.button_label}” continua o fluxo`
                        : `“${item.button_label}” → ${item.button_url}`}
                    </p>
                  </div>
                  <div className="flex gap-2 border-t border-[var(--border)] p-2">
                    <button className="btn btn-ghost flex-1" onClick={() => open(item)}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      className="btn btn-ghost text-[var(--danger)]"
                      aria-label="Apagar"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {editing && (
          <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold">
              {editing === "new" ? "Novo item" : "Editar item"}
            </h2>

            <div>
              <span className="label">Imagem</span>
              {draft.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.image_url}
                  alt=""
                  className="mb-2 aspect-[1.91/1] w-full rounded-lg bg-[var(--bg-elev-2)] object-cover"
                />
              )}
              <div className="flex gap-2">
                <input
                  className="input font-mono text-xs"
                  placeholder="https://… ou envie um arquivo"
                  value={draft.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost shrink-0"
                  aria-label="Enviar imagem"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                JPG ou PNG, até 8 MB. O Instagram mostra em 1.91:1.
              </p>
            </div>

            <Field label="Título" max={CATALOG_LIMITS.title} value={draft.title}>
              <input
                className="input"
                maxLength={CATALOG_LIMITS.title}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>

            <Field label="Descrição curta" max={CATALOG_LIMITS.subtitle} value={draft.subtitle}>
              <textarea
                rows={2}
                className="input resize-none"
                maxLength={CATALOG_LIMITS.subtitle}
                value={draft.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
              />
            </Field>

            <Field label="Texto do botão" max={CATALOG_LIMITS.buttonLabel} value={draft.button_label}>
              <input
                className="input"
                maxLength={CATALOG_LIMITS.buttonLabel}
                value={draft.button_label}
                onChange={(e) => set("button_label", e.target.value)}
              />
            </Field>

            <div>
              <span className="label">O botão…</span>
              <div className="flex rounded-md border border-[var(--border)] p-0.5 text-xs">
                {(
                  [
                    ["url", "Abre um link"],
                    ["flow", "Continua o fluxo"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "flex-1 rounded px-2 py-1 transition-colors",
                      draft.button_action === value
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--fg-muted)]",
                    )}
                    onClick={() => set("button_action", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.button_action === "url" ? (
                <input
                  className="input mt-2 font-mono text-xs"
                  placeholder="https://seusite.com/produto"
                  value={draft.button_url}
                  onChange={(e) => set("button_url", e.target.value)}
                />
              ) : (
                <p className="mt-2 text-[11px] text-[var(--fg-dim)]">
                  O destino é escolhido em cada fluxo: o card ganha uma saída própria no bloco
                  Carrossel.
                </p>
              )}
            </div>

            {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}

            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={save}
                disabled={saving || uploading}
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Salvar
              </button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  max,
  value,
  children,
}: {
  label: string;
  max: number;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="text-[10px] text-[var(--fg-dim)]">
          {value.length}/{max}
        </span>
      </div>
      {children}
    </div>
  );
}
