const SPRITE_CDN_BASE_URL =
  "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom";

export function getSpriteVariantSuffix(index: number): string {
  if (index === 0) {
    return "";
  }

  let suffix = "";
  let remaining = index - 1;

  do {
    suffix = String.fromCharCode(97 + (remaining % 26)) + suffix;
    remaining = Math.floor(remaining / 26);
  } while (remaining > 0);

  return suffix;
}

export function generateSpriteVariantUrl(id: string, variant = ""): string {
  return `${SPRITE_CDN_BASE_URL}/${id}${variant}.png`;
}
