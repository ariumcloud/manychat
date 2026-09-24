import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import type { Flow } from "@/lib/flow/types";
import { upgradeLegacyNodes } from "@/lib/flow/legacy";
import { FlowBuilder } from "./FlowBuilder";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await db().from("mc_flows").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <FlowBuilder flow={upgradeLegacyNodes(data as Flow)} />;
}
