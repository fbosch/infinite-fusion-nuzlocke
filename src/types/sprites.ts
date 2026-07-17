export interface SpriteVariantsResponse {
  variants: string[];
  cacheKey: string;
  timestamp: number;
}

export interface SpriteVariantsError {
  error: string;
}

type SpriteVariantsApiResponse = SpriteVariantsResponse | SpriteVariantsError;
