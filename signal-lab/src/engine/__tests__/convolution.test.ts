import { describe, it, expect } from "vitest";
import { convolve } from "../convolution";
import { generateRectangularPulse } from "../signals";

describe("Convolution", () => {
  it("should compute convolution of two rectangular pulses", () => {
    const sig1 = generateRectangularPulse(0, 0.5, 1000, 1);
    const sig2 = generateRectangularPulse(0, 0.3, 1000, 1);
    const result = convolve(sig1, sig2);

    const expectedLen = sig1.samples.length + sig2.samples.length - 1;
    expect(result.samples.length).toBe(expectedLen);
  });

  it("should produce non-zero convolution output", () => {
    const sig1 = generateRectangularPulse(0.2, 0.5, 1000, 1);
    const sig2 = generateRectangularPulse(0.2, 0.5, 1000, 1);
    const result = convolve(sig1, sig2);

    const nonZeroCount = Array.from(result.samples).filter((v) => v > 0.001).length;
    expect(nonZeroCount).toBeGreaterThan(0);
  });
});
