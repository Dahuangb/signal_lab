import type { Signal } from "./signals";

export function sampleSignal(
  continuousSignal: Signal,
  sampleRate: number
): Signal {
  const Ts = 1 / sampleRate;
  const numSamples = Math.floor(continuousSignal.duration / Ts);
  const samples = new Float64Array(numSamples);

  for (let n = 0; n < numSamples; n++) {
    const t = n * Ts;
    const originalIndex = Math.round(t * continuousSignal.sampleRate);
    if (originalIndex < continuousSignal.samples.length) {
      samples[n] = continuousSignal.samples[originalIndex];
    }
  }

  return {
    samples,
    sampleRate,
    duration: continuousSignal.duration,
    label: `sampled@${sampleRate}Hz`,
  };
}

export function reconstructZOH(
  sampledSignal: Signal,
  originalRate: number
): Signal {
  const Ts = 1 / sampledSignal.sampleRate;
  const length = Math.floor(sampledSignal.duration * originalRate);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / originalRate;
    const sampleIndex = Math.floor(t / Ts);
    if (sampleIndex < sampledSignal.samples.length) {
      samples[i] = sampledSignal.samples[sampleIndex];
    }
  }

  return {
    samples,
    sampleRate: originalRate,
    duration: sampledSignal.duration,
    label: "ZOH reconstructed",
  };
}

export function generateImpulseTrain(
  frequency: number,
  sampleRate: number,
  duration: number
): Signal {
  const Ts = 1 / frequency;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const remainder = t % Ts;
    if (remainder < 1 / sampleRate) {
      samples[i] = 1;
    }
  }

  return { samples, sampleRate, duration, label: `impulse@${frequency}Hz` };
}

export function generateSampledSignal(
  signal: Signal,
  sampleRate: number,
  displayRate: number
): { original: Float64Array; sampled: Float64Array; timeAxis: Float64Array } {
  const duration = signal.duration;
  const length = Math.floor(displayRate * duration);
  const Ts = 1 / sampleRate;

  const original = new Float64Array(length);
  const sampled = new Float64Array(length);
  const timeAxis = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / displayRate;
    timeAxis[i] = t;

    const sigIndex = Math.round(t * signal.sampleRate);
    if (sigIndex < signal.samples.length) {
      original[i] = signal.samples[sigIndex];
    }

    const remainder = t % Ts;
    if (remainder < 1 / displayRate) {
      if (sigIndex < signal.samples.length) {
        sampled[i] = signal.samples[sigIndex];
      }
    }
  }

  return { original, sampled, timeAxis };
}
