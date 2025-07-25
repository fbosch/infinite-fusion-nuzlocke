export interface SpriteVariantsResponse {
  variants: string[];
  cacheKey: string;
  timestamp: number;
}

export interface SpriteVariantsError {
  error: string;
}

export type SpriteVariantsApiResponse =
  | SpriteVariantsResponse
  | SpriteVariantsError;
