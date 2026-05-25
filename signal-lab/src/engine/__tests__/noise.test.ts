import { describe, it, expect } from "vitest";
import { generateAWGN, awgn } from "../noise";
import { generateSine } from "../signals";

describe("Noise", () => {
  it("should generate AWGN with correct length", () => {
    const noise = generateAWGN(1000, 1);
    expect(noise.length).toBe(1000);
  });

  it("should have approximately correct power", () => {
    const noise = generateAWGN(10000, 1);
    let power = 0;
    for (let i = 0; i < noise.length; i++) {
      power += noise[i] * noise[i];
    }
    power /= noise.length;
    expect(power).toBeGreaterThan(0.8);
    expect(power).toBeLessThan(1.2);
  });

  it("should add noise to signal", () => {
    const signal = generateSine(10, 1000, 1);
    const noisy = awgn(signal.samples, 20);
    expect(noisy.length).toBe(signal.samples.length);

    let changed = false;
    for (let i = 0; i < noisy.length; i++) {
      if (Math.abs(noisy[i] - signal.samples[i]) > 1e-6) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it("should handle zero signal gracefully", () => {
    const signal = new Float64Array(100);
    const result = awgn(signal, 10);
    expect(result.length).toBe(100);
  });
});
