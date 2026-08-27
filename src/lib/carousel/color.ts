/**
 * Manipulação de cor para os temas do carrossel.
 *
 * Existe porque a cor de destaque é escolhida pela pessoa: o tema não pode ter
 * um roxo chumbado se ela quiser o roxo DELA. A partir de um único hex dá para
 * derivar o resto — versão clara para fundo escuro, versão escura para papel
 * claro, e a cor do texto que fica legível por cima.
 */

export type Hsl = { h: number; s: number; l: number };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `null` quando não é um hex válido — quem chama cai no padrão do tema. */
export function normalizeHex(input: string | null | undefined): string | null {
  const value = input?.trim();
  if (!value || !HEX.test(value)) return null;

  const raw = value.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return `#${full.toLowerCase()}`;
}

export function hexToHsl(hex: string): Hsl {
  const raw = (normalizeHex(hex) ?? "#7c5cff").slice(1);
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const hue = ((h % 360) + 360) % 360;

  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Move matiz, saturação e luminosidade. Base para derivar uma paleta. */
export function shift(hex: string, dh = 0, ds = 0, dl = 0): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex({ h: h + dh, s: s + ds, l: l + dl });
}

/** Fixa a luminosidade — é assim que a cor fica legível sobre um fundo dado. */
export function atLightness(hex: string, l: number, minSat = 0): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ h: hsl.h, s: Math.max(hsl.s, minSat), l });
}

/** Luminância relativa (WCAG), para decidir se o texto por cima é claro ou escuro. */
export function luminance(hex: string): number {
  const raw = (normalizeHex(hex) ?? "#000000").slice(1);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(raw.slice(0, 2), 16));
  const g = channel(parseInt(raw.slice(2, 4), 16));
  const b = channel(parseInt(raw.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto que se lê por cima desta cor. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#12121a" : "#ffffff";
}

/**
 * Cinco fundos a partir de uma cor só, para o tema Pôster.
 * Anda pelo matiz e alterna a luminosidade — mantém parentesco sem virar
 * cinco slides da mesma cor exata.
 */
export function posterPalette(hex: string) {
  const base = hexToHsl(hex);
  const steps = [
    { dh: 0, l: base.l },
    { dh: 26, l: base.l - 6 },
    { dh: -24, l: base.l + 5 },
    { dh: 48, l: base.l - 3 },
    { dh: -46, l: base.l + 2 },
  ];

  return steps.map(({ dh, l }) => {
    const bg = hslToHex({ h: base.h + dh, s: Math.max(45, base.s), l: Math.min(58, Math.max(28, l)) });
    return {
      bg,
      ink: inkOn(bg) === "#ffffff" ? "#ffffff" : "#12121a",
      // O acento tem que brigar com o fundo: claro sobre escuro, escuro sobre claro.
      accent: luminance(bg) > 0.45 ? atLightness(hex, 22, 60) : hslToHex({ h: base.h + dh + 40, s: 92, l: 68 }),
    };
  });
}
