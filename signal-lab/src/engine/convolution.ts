import type { Signal } from "./signals";

export function convolve(signal1: Signal, signal2: Signal): Signal {
  const len1 = signal1.samples.length;
  const len2 = signal2.samples.length;
  const outputLength = len1 + len2 - 1;
  const samples = new Float64Array(outputLength);

  for (let n = 0; n < outputLength; n++) {
    let sum = 0;
    for (let k = 0; k < len2; k++) {
      const xIndex = n - k;
      if (xIndex >= 0 && xIndex < len1) {
        sum += signal1.samples[xIndex] * signal2.samples[k];
      }
    }
    samples[n] = sum;
  }

  const totalDuration = signal1.duration + signal2.duration;
  const newSampleRate = signal1.sampleRate;

  return {
    samples,
    sampleRate: newSampleRate,
    duration: totalDuration,
    label: `${signal1.label} * ${signal2.label}`,
  };
}

export interface ConvolutionStep {
  shiftIndex: number;
  partial: Float64Array;
  outputSample: number;
  overlapStart: number;
  overlapEnd: number;
}

export function convolveStepByStep(
  signal1: Signal,
  signal2: Signal,
  step: number
): ConvolutionStep {
  const len1 = signal1.samples.length;
  const len2 = signal2.samples.length;

  const partial = new Float64Array(len2);
  for (let i = 0; i < len2; i++) {
    partial[i] = signal2[len2 - 1 - i];
  }

  let outputSample = 0;
  const overlapStart = Math.max(0, step - len2 + 1);
  const overlapEnd = Math.min(len1 - 1, step);

  for (let k = overlapStart; k <= overlapEnd; k++) {
    const hIndex = step - k;
    if (hIndex >= 0 && hIndex < len2) {
      outputSample += signal1.samples[k] * signal2.samples[hIndex];
    }
  }

  return { shiftIndex: step, partial, outputSample, overlapStart, overlapEnd };
}
