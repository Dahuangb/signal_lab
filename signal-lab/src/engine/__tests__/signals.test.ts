import { describe, it, expect } from "vitest";
import {
  generateSine,
  generateSquare,
  generateSawtooth,
  generateTriangle,
  generateGaussianPulse,
  generateRectangularPulse,
  addSignals,
} from "../signals";

describe("Signal Generation", () => {
  it("should generate sine wave with correct length", () => {
    const sig = generateSine(10, 1000, 1);
    expect(sig.samples.length).toBe(1000);
    expect(sig.sampleRate).toBe(1000);
  });

  it("should generate square wave via harmonics", () => {
    const sig = generateSquare(5, 1000, 1, 10);
    expect(sig.samples.length).toBe(1000);
    expect(sig.samples[0]).toBeCloseTo(0, 3);
  });

  it("should generate sawtooth wave", () => {
    const sig = generateSawtooth(5, 1000, 1, 10);
    expect(sig.samples.length).toBe(1000);
  });

  it("should generate triangle wave", () => {
    const sig = generateTriangle(5, 1000, 1, 10);
    expect(sig.samples.length).toBe(1000);
  });

  it("should generate Gaussian pulse", () => {
    const sig = generateGaussianPulse(0.5, 0.1, 1000, 1);
    expect(sig.samples.length).toBe(1000);
    expect(sig.samples[500]).toBeGreaterThan(0.9);
  });

  it("should generate rectangular pulse", () => {
    const sig = generateRectangularPulse(0.2, 0.8, 1000, 1);
    expect(sig.samples.length).toBe(1000);
    expect(sig.samples[300]).toBe(1);
    expect(sig.samples[100]).toBe(0);
    expect(sig.samples[900]).toBe(0);
  });

  it("should add multiple signals", () => {
    const sig1 = generateSine(10, 1000, 1, 0.5);
    const sig2 = generateSine(20, 1000, 1, 0.3);
    const sum = addSignals(sig1, sig2);
    expect(sum.samples.length).toBe(1000);
  });
});
