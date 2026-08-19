import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandler() {
  const account = await getAccount();
  const { data, error } = await db()
    .from("conversations")
    .select("*, contacts(id, igsid, username, name, profile_picture_url)")
    .eq("account_id", account.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data });
}

export const GET = withApi(getHandler);
