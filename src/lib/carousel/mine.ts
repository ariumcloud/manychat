import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { pickProvider } from "./providers";

export const ThemesSchema = z.object({
  themes: z.array(
    z.object({
      tema: z.string(),
      quantas: z.number(),
      exemplos: z.array(z.string()),
      sugestao_de_post: z.string(),
    }),
  ),
});

export type MinedThemes = z.infer<typeof ThemesSchema>;

const SYSTEM = `Você recebe comentários reais de um post do Instagram e agrupa o que as
pessoas estão de fato perguntando ou travando.

REGRAS

1. Agrupe por INTENÇÃO, não por palavra. "quanto custa", "é pago?" e "tem free?"
   são o mesmo tema.
2. Ignore comentário sem conteúdo: elogio solto, emoji, marcação de amigo,
   "top", "salvei". Não vire tema.
3. "quantas" é a contagem real de comentários naquele tema. Não invente.
4. Em "exemplos", cite no máximo 3 comentários literais, sem alterar o texto.
5. "sugestao_de_post" é UMA frase: o post que responderia esse tema, específico
   o bastante para virar carrossel. Nada de "fale sobre preços".
6. No máximo 6 temas, do mais frequente para o menos.
7. Se não houver pergunta nenhuma nos comentários, devolva a lista vazia.

Escreva em português do Brasil.`;

function userPrompt(comments: string[]) {
  return `Estes são os comentários do post (um por linha):\n\n${comments
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n")}`;
}

export async function mineComments(comments: string[]): Promise<MinedThemes> {
  if (pickProvider() === "openai") {
    const client = new OpenAI();
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt(comments) },
      ],
      text: { format: zodTextFormat(ThemesSchema, "themes") },
    });

    const refusal = response.output
      .flatMap((o) => (o.type === "message" ? o.content : []))
      .find((c) => c.type === "refusal");
    if (refusal && "refusal" in refusal) {
      throw new Error(`A OpenAI recusou o pedido: ${refusal.refusal}`);
    }
    if (!response.output_parsed) throw new Error("Não consegui agrupar os comentários.");
    return response.output_parsed;
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(ThemesSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt(comments) }],
  });

  if (!response.parsed_output) throw new Error("Não consegui agrupar os comentários.");
  return response.parsed_output;
}
