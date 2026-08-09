import { describe, expect, it } from "vitest";
import {
  findFirstOverlappingPair,
  forEachOverlappingPair,
  getPackedBounds,
  rectanglesOverlap,
} from "../scripts/utils/sprite-packing-utils";

describe("sprite packing geometry", () => {
  it("treats shared edges as non-overlapping", () => {
    expect(
      rectanglesOverlap(
        { height: 10, width: 10, x: 0, y: 0 },
        { height: 10, width: 10, x: 10, y: 0 },
      ),
    ).toBe(false);
  });

  it("detects intersecting rectangles", () => {
    expect(
      rectanglesOverlap(
        { height: 10, width: 10, x: 0, y: 0 },
        { height: 10, width: 10, x: 9, y: 9 },
      ),
    ).toBe(true);
  });

  it("returns the outer bounds of packed rectangles", () => {
    expect(
      getPackedBounds([
        { height: 8, width: 12, x: 0, y: 0 },
        { height: 11, width: 10, x: 12, y: 3 },
      ]),
    ).toEqual({ height: 14, width: 22 });
  });

  it("finds and visits overlapping pairs without visiting disjoint rectangles", () => {
    const rectangles = [
      { height: 10, width: 10, x: 0, y: 0 },
      { height: 10, width: 10, x: 9, y: 0 },
      { height: 10, width: 10, x: 30, y: 0 },
    ];
    const visited: [number, number][] = [];

    expect(
      forEachOverlappingPair(rectangles, (a, b) => {
        visited.push([rectangles.indexOf(a), rectangles.indexOf(b)]);
        return false;
      }),
    ).toBe(true);
    expect(visited).toEqual([[0, 1]]);
    expect(findFirstOverlappingPair(rectangles)).toEqual([
      rectangles[0],
      rectangles[1],
    ]);
  });
});
