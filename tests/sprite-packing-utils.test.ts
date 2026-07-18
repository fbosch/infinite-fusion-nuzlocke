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
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it("detects intersecting rectangles", () => {
    expect(
      rectanglesOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 9, y: 9, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it("returns the outer bounds of packed rectangles", () => {
    expect(
      getPackedBounds([
        { x: 0, y: 0, width: 12, height: 8 },
        { x: 12, y: 3, width: 10, height: 11 },
      ]),
    ).toEqual({ width: 22, height: 14 });
  });

  it("finds and visits overlapping pairs without visiting disjoint rectangles", () => {
    const rectangles = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 9, y: 0, width: 10, height: 10 },
      { x: 30, y: 0, width: 10, height: 10 },
    ];
    const visited: Array<[number, number]> = [];

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
