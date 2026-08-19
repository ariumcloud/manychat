import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth";

/**
 * Protege o painel inteiro. O webhook fica de fora de proposito: ele e chamado
 * pelo Meta e ja se autentica pela assinatura HMAC do corpo.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/auth") ||
    // Links rastreados sao abertos pelos seus seguidores, nao por voce.
    pathname.startsWith("/r/") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Sem AUTH_SECRET o app ainda nao foi configurado; deixa passar pro wizard.
    return NextResponse.next();
  }

  const ok = await verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
