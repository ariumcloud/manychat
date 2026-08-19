import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { CarouselSchema, SYSTEM, userPrompt, type ParsedCarousel } from "./prompt";

export type Provider = "anthropic" | "openai";

/**
 * Escolhe o provedor. AI_PROVIDER manda; sem ele, usa a chave que existir.
 * Ter os dois plugados evita ficar refém de um crédito acabando.
 */
export function pickProvider(): Provider {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "openai" || forced === "anthropic") return forced;
  if (process.env.OPENAI_API_KEY) return "openai";
  return "anthropic";
}

export function providerLabel(p: Provider) {
  return p === "openai"
    ? `OpenAI · ${process.env.OPENAI_MODEL ?? "gpt-5.6-terra"}`
    : "Anthropic · claude-opus-5";
}

async function withAnthropic(brief: string): Promise<ParsedCarousel> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Defina ANTHROPIC_API_KEY no .env.local (ou use AI_PROVIDER=openai com OPENAI_API_KEY).",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(CarouselSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt(brief) }],
  });

  if (!response.parsed_output) {
    throw new Error("O modelo não devolveu um roteiro válido. Descreva o teste com mais detalhe.");
  }
  return response.parsed_output;
}

async function withOpenAI(brief: string): Promise<ParsedCarousel> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Defina OPENAI_API_KEY no .env.local.");
  }

  const client = new OpenAI();
  // Modelos atuais: gpt-5.6-sol (mais capaz), gpt-5.6-terra (equilibrado),
  // gpt-5.6-luna (mais barato). Aqui o texto É o produto, então o default é terra.
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";

  const response = await client.responses.parse({
    model,
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(brief) },
    ],
    text: { format: zodTextFormat(CarouselSchema, "carousel") },
  });

  // Recusa por política volta num campo próprio, não como erro — precisa checar.
  const refusal = response.output
    .flatMap((o) => (o.type === "message" ? o.content : []))
    .find((c) => c.type === "refusal");

  if (refusal && "refusal" in refusal) {
    throw new Error(`A OpenAI recusou o pedido: ${refusal.refusal}`);
  }

  if (!response.output_parsed) {
    throw new Error("O modelo não devolveu um roteiro válido. Descreva o teste com mais detalhe.");
  }
  return response.output_parsed;
}

export async function runProvider(brief: string): Promise<ParsedCarousel> {
  return pickProvider() === "openai" ? withOpenAI(brief) : withAnthropic(brief);
}
