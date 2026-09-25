import type { NextConfig } from "next";

/** Telas do painel, que antes ficavam na raiz e agora moram em /dashboard. */
const PANEL = [
  "automacoes",
  "carrossel",
  "catalogo",
  "configuracoes",
  "contatos",
  "desempenho",
  "duvidas",
  "inbox",
  "reels",
  "testes-api",
];

const nextConfig: NextConfig = {
  // Links e favoritos antigos continuam funcionando (temporarios de proposito:
  // trocar para permanentes so quando ninguem mais usar as URLs velhas).
  async redirects() {
    return [
      { source: "/planos", destination: "/", permanent: false },
      { source: "/fluxos/:path*", destination: "/dashboard/fluxos/:path*", permanent: false },
      ...PANEL.map((page) => ({
        source: `/${page}`,
        destination: `/dashboard/${page}`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
