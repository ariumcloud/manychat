export type Slide = {
  n: number;
  /** Texto do card. Usa **negrito** nos números — é o que dá credibilidade. */
  text: string;
  /** O print que precisa ser capturado para este slide. "" quando não precisa. */
  screenshot_hint: string;
  /** URL pública do print depois do upload. */
  image_url?: string | null;
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
