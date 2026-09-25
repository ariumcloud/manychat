import Image from "next/image";
import { BRAND } from "@/lib/brand";

/** Proporção do logo (897×763): a altura manda, a largura acompanha. */
const RATIO = 897 / 763;

/** Logo da marca (public/brand/logo.png), com o nome ao lado quando `withName`. */
export function BrandMark({ size = 32, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/brand/logo.png"
        alt={withName ? "" : BRAND.name}
        aria-hidden={withName}
        width={Math.round(size * RATIO)}
        height={size}
        priority
        className="shrink-0"
      />
      {withName && <span className="font-semibold tracking-tight">{BRAND.name}</span>}
    </span>
  );
}
