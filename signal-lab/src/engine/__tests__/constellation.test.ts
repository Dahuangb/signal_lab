import { describe, it, expect } from "vitest";
import { generateConstellation, generateDecisionBoundaries } from "../constellation";

describe("Constellation", () => {
  it("should generate BPSK constellation", () => {
    const points = generateConstellation("BPSK");
    expect(points.length).toBe(2);
    expect(points[0].i).toBe(-1);
    expect(points[1].i).toBe(1);
  });

  it("should generate QPSK constellation", () => {
    const points = generateConstellation("QPSK");
    expect(points.length).toBe(4);
  });

  it("should generate 16QAM constellation", () => {
    const points = generateConstellation("16QAM");
    expect(points.length).toBe(16);
  });

  it("should generate correct decision boundaries for QPSK", () => {
    const boundaries = generateDecisionBoundaries("QPSK");
    expect(boundaries.horizontal).toEqual([0]);
    expect(boundaries.vertical).toEqual([0]);
  });

  it("should generate correct decision boundaries for 16QAM", () => {
    const boundaries = generateDecisionBoundaries("16QAM");
    expect(boundaries.horizontal).toEqual([-2, 0, 2]);
    expect(boundaries.vertical).toEqual([-2, 0, 2]);
  });
});
