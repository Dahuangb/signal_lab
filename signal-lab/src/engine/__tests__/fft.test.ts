import { describe, it, expect } from "vitest";
import { fft, ifft, computeSpectrum } from "../fft";
import { generateSine } from "../signals";

describe("FFT", () => {
  it("should compute FFT of a simple signal", () => {
    const real = new Float64Array([1, 0, 0, 0]);
    const imag = new Float64Array([0, 0, 0, 0]);
    fft(real, imag);

    for (let i = 0; i < 4; i++) {
      expect(real[i]).toBeCloseTo(1, 5);
      expect(imag[i]).toBeCloseTo(0, 5);
    }
  });

  it("should correctly round-trip via FFT and IFFT", () => {
    const original = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const real = new Float64Array(original);
    const imag = new Float64Array(8);

    fft(real, imag);
    ifft(real, imag);

    for (let i = 0; i < 8; i++) {
      expect(real[i]).toBeCloseTo(original[i], 5);
    }
  });

  it("should compute spectrum of a sine wave", () => {
    const signal = generateSine(10, 1024, 1);
    const spectrum = computeSpectrum(signal.samples, 1024);

    const peakIndex = 10;
    expect(spectrum.magnitudes[peakIndex]).toBeGreaterThan(0.3);
    expect(spectrum.magnitudes[peakIndex]).toBeGreaterThan(
      spectrum.magnitudes[peakIndex + 1]
    );
  });

  it("should throw on non-power-of-2 length", () => {
    const real = new Float64Array(3);
    const imag = new Float64Array(3);
    expect(() => fft(real, imag)).toThrow();
  });
});
