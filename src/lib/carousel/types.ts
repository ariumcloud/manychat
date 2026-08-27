/**
 * O bloco em destaque do slide — o cartão escuro dos carrosséis bem editados.
 * É ele que transforma texto corrido em informação com forma.
 */
export type SlideCard =
  /** Lista com setas. */
  | { kind: "bullets"; title?: string; items: string[]; note?: string }
  /** Cadeia vertical (A ↓ B ↓ C), com o último item em destaque. */
  | { kind: "flow"; title?: string; items: string[] }
  /** Passos numerados. */
  | { kind: "steps"; title?: string; items: string[] }
  /** Só um parágrafo, quando o conteúdo não é lista. */
  | { kind: "text"; title?: string; body: string };

export type Slide = {
  n: number;
  /** Texto do card. Usa **negrito** nos números — é o que dá credibilidade. */
  text: string;
  /** O print que precisa ser capturado para este slide. "" quando não precisa. */
  screenshot_hint: string;
  /** URL pública do print depois do upload. */
  image_url?: string | null;

  // --- estrutura opcional. Sem isto o slide ainda desenha, só mais simples ---
  /** Rótulo curto acima do bloco: "O PROBLEMA", "A GRANDE SACADA". */
  eyebrow?: string;
  /** Trilha em monoespaçada: "nicho / subnicho / dor-especifica". */
  breadcrumb?: string;
  /** Linha em serifa itálica logo abaixo da manchete. */
  subhead?: string;
  /** O cartão escuro. */
  card?: SlideCard;
  /** Fecho embaixo do slide, com **destaque**. */
  kicker?: string;
};

export type Carousel = {
  id: string;
  account_id: string;
  brief: string;
  title: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  slides: Slide[];
  /** Tema visual do slide. Ver `themes.tsx`. */
  theme?: string | null;
  /** Cor de destaque em hex. Vazio = a cor padrão do tema. */
  accent?: string | null;
  status: string;
  published_at: string | null;
  ig_media_id: string | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
};

/** 4:5 — o formato que ocupa mais tela no feed do Instagram. */
export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;
