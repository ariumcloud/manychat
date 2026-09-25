import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import type { Flow } from "@/lib/flow/types";
import { FlowBuilder } from "./FlowBuilder";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountCached();
  if (!account) notFound();
  const { data } = await db()
    .from("mc_flows")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!data) notFound();
  return <FlowBuilder flow={data as Flow} />;
}
