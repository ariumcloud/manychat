import crypto from "node:crypto";
import { env } from "../env";

/**
 * O Meta assina cada POST de webhook com HMAC-SHA256 do corpo CRU usando o
 * app secret. Sem isso qualquer um poderia forjar eventos no seu endpoint.
 */
export function verifySignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", env.metaAppSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
