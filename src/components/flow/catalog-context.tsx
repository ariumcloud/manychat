"use client";

import { createContext, useContext } from "react";
import type { CatalogItem } from "@/lib/catalog";

/**
 * Itens do catalogo carregados pelo FlowBuilder. O no de carrossel guarda so
 * ids; para desenhar cards e saidas ele precisa do titulo e da acao de cada um.
 */
export type CatalogState = {
  items: CatalogItem[];
  byId: Map<string, CatalogItem>;
  loading: boolean;
  error: string | null;
};

export const CatalogContext = createContext<CatalogState>({
  items: [],
  byId: new Map(),
  loading: false,
  error: null,
});

export function useCatalog() {
  return useContext(CatalogContext);
}
