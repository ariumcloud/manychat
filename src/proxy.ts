import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth";

/**
 * Protege o painel inteiro. O webhook fica de fora de proposito: ele e chamado
 * pelo Meta e ja se autentica pela assinatura HMAC do corpo.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/auth") ||
    // Cron da Vercel: autentica pelo CRON_SECRET na propria rota.
    pathname.startsWith("/api/cron") ||
    // Conector MCP: autentica pela chave na propria URL (api/mcp/<chave>).
    pathname.startsWith("/api/mcp") ||
    // Links rastreados sao abertos pelos seus seguidores, nao por voce.
    pathname.startsWith("/r/") ||
    // Pagina de vendas: publica.
    pathname === "/planos" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Sem AUTH_SECRET o app ainda nao foi configurado; deixa passar pro wizard.
    return NextResponse.next();
  }

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value, secret);
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhook|api/auth|api/cron|api/mcp|r/|login|planos|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|ttf|eot|mp3|wav|json|txt)$).*)",
  ],
};
