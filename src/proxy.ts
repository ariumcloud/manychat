import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth";

/**
 * Protege o painel inteiro. O webhook fica de fora de proposito: ele e chamado
 * pelo Meta e ja se autentica pela assinatura HMAC do corpo.
 */
/**
 * Ferramentas internas do dono: o cliente nao ve no menu E nao abre pela URL.
 * O papel vem do cookie de sessao assinado, entao nao da para forjar.
 */
const ADMIN_ONLY = [
  "/dashboard/carrossel",
  "/dashboard/testes-api",
  "/api/carousels",
  "/api/meta-tests",
  "/api/test-send",
];

const isAdminOnly = (pathname: string) =>
  ADMIN_ONLY.some((base) => pathname === base || pathname.startsWith(`${base}/`));

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/webhook") ||
    // Webhook da Stripe: autentica pela assinatura do corpo (STRIPE_WEBHOOK_SECRET).
    pathname === "/api/stripe/webhook" ||
    pathname.startsWith("/api/auth") ||
    // Cron da Vercel: autentica pelo CRON_SECRET na propria rota.
    pathname.startsWith("/api/cron") ||
    // Conector MCP: autentica pela chave na propria URL (api/mcp/<chave>).
    pathname.startsWith("/api/mcp") ||
    // Links rastreados sao abertos pelos seus seguidores, nao por voce.
    pathname.startsWith("/r/") ||
    // Pagina de vendas (a raiz): publica.
    pathname === "/" ||
    pathname === "/cadastro" ||
    // Paginas legais (exigidas pela Meta para o App Review): publicas.
    pathname === "/privacidade" ||
    pathname === "/termos" ||
    pathname === "/exclusao-de-dados" ||
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
  if (session) {
    if (session.role !== "admin" && isAdminOnly(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Recurso indisponível para o seu plano." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Guarda o destino COMPLETO (com a query, ex.: ?plan=pro do checkout) e nao
  // repassa a query original ao login, senao ela se perde na volta.
  const next = pathname + req.nextUrl.search;
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhook|api/stripe/webhook|api/auth|api/cron|api/mcp|r/|login|planos|cadastro|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|ttf|eot|mp3|wav|json|txt)$).*)",
  ],
};
