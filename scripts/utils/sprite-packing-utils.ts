export type SpriteRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function rectanglesOverlap(
  a: SpriteRectangle,
  b: SpriteRectangle,
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getPackedBounds(rectangles: SpriteRectangle[]): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(
      ...rectangles.map((rectangle) => rectangle.x + rectangle.width),
    ),
    height: Math.max(
      ...rectangles.map((rectangle) => rectangle.y + rectangle.height),
    ),
  };
}

export function forEachOverlappingPair<T extends SpriteRectangle>(
  rectangles: T[],
  visit: (a: T, b: T) => boolean,
): boolean {
  let foundOverlap = false;

  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const a = rectangles[i];
      const b = rectangles[j];

      if (!a || !b) continue;

      if (rectanglesOverlap(a, b)) {
        foundOverlap = true;
        if (visit(a, b)) return true;
      }
    }
  }

  return foundOverlap;
}

export function findFirstOverlappingPair<T extends SpriteRectangle>(
  rectangles: T[],
): [T, T] | undefined {
  let pair: [T, T] | undefined;
  forEachOverlappingPair(rectangles, (a, b) => {
    pair = [a, b];
    return true;
  });
  return pair;
}
