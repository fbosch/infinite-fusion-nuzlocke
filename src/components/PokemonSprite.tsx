import Image from "next/image";
import type React from "react";
import { twMerge } from "tailwind-merge";
import gen7SpritesheetMetadata from "@/assets/pokemon-gen7-spritesheet-metadata.json";
import spritesheetMetadata from "@/assets/pokemon-gen8-spritesheet-metadata.json";

interface PokemonSpriteProps extends React.HTMLAttributes<HTMLImageElement> {
  className?: string;
  draggable?: boolean;
  /**
   * Sprite generation to use.
   * - 'gen8': Standard size sprites (default)
   * - 'gen7': More compact sprites for space efficiency
   */
  generation?: "gen7" | "gen8";
  loading?: "eager" | "lazy";
  pokemonId: number;
  priority?: boolean;
}

export function PokemonSprite({
  pokemonId,
  generation = "gen8",
  className = "",
  loading = "lazy",
  priority = false,
  ...rest
}: PokemonSpriteProps) {
  const metadata =
    generation === "gen7" ? gen7SpritesheetMetadata : spritesheetMetadata;

  const spriteData = metadata.sprites.find((sprite) => sprite.id === pokemonId);

  if (!spriteData?.exists) {
    return null;
  }

  const spritesheetSrc =
    generation === "gen7"
      ? `/images/pokemon-gen7-spritesheet.webp?v=${metadata.spritesheetVersion}`
      : `/images/pokemon-gen8-spritesheet.webp?v=${metadata.spritesheetVersion}`;

  return (
    <Image
      alt={`${spriteData.name} sprite (${generation})`}
      className={twMerge("object-none", className)}
      decoding="async"
      height={spriteData.height}
      loading={loading}
      priority={priority}
      src={spritesheetSrc}
      style={{
        height: spriteData.height,
        imageRendering: "pixelated",
        minHeight: spriteData.height,
        minWidth: spriteData.width,
        objectPosition: `-${spriteData.x}px -${spriteData.y}px`,
        width: spriteData.width,
      }}
      unoptimized
      width={spriteData.width}
      {...rest}
    />
  );
}
