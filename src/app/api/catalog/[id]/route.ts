import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { parseCatalogInput } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function patchHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const parsed = parseCatalogInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await db()
    .from("mc_catalog_items")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", account.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  return NextResponse.json({ item: data });
}

/**
 * Item usado em algum fluxo nao sai: o card sumiria do carrossel sem ninguem
 * perceber. A resposta diz em quais fluxos ele esta, para tirar de la antes.
 */
async function deleteHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const supabase = db();

  const { data: usedIn, error: usageError } = await supabase
    .from("mc_flows")
    .select("name")
    .eq("account_id", account.id)
    .contains("nodes", [{ type: "carousel", data: { items: [id] } }]);

  if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });
  if (usedIn?.length) {
    const names = usedIn.map((f) => `"${f.name}"`).join(", ");
    return NextResponse.json(
      { error: `Este item está em uso nos fluxos ${names}. Remova-o dos carrosséis antes.` },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("mc_catalog_items")
    .delete()
    .eq("id", id)
    .eq("account_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApi(patchHandler);
export const DELETE = withApi(deleteHandler);
