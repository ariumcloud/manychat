import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "mc-catalog";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };

/**
 * Guarda a imagem de um card no Storage e devolve a URL publica. Tem que ser
 * publica: quem baixa a imagem na hora do envio e o Instagram.
 */
async function postHandler(req: Request) {
  const account = await getAccount();
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use JPG ou PNG." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem com no máximo 8 MB." }, { status: 400 });
  }

  const supabase = db();
  const path = `${account.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: `Falha no upload: ${error.message}` }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}

export const POST = withApi(postHandler);
