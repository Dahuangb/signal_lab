export interface Signal {
  samples: Float64Array;
  sampleRate: number;
  duration: number;
  label: string;
}

export function generateSine(
  frequency: number,
  sampleRate: number,
  duration: number,
  amplitude = 1,
  phase = 0
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
  }

  return { samples, sampleRate, duration, label: `${frequency}Hz sine` };
}

export function generateCosine(
  frequency: number,
  sampleRate: number,
  duration: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = amplitude * Math.cos(2 * Math.PI * frequency * t);
  }

  return { samples, sampleRate, duration, label: `${frequency}Hz cosine` };
}

export function generateSquare(
  frequency: number,
  sampleRate: number,
  duration: number,
  harmonics: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (let k = 1; k <= harmonics; k++) {
      const n = 2 * k - 1;
      sum += Math.sin(2 * Math.PI * frequency * n * t) / n;
    }
    samples[i] = (4 * amplitude / Math.PI) * sum;
  }

  return { samples, sampleRate, duration, label: `${frequency}Hz square` };
}

export function generateSawtooth(
  frequency: number,
  sampleRate: number,
  duration: number,
  harmonics: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (let k = 1; k <= harmonics; k++) {
      sum += Math.sin(2 * Math.PI * frequency * k * t) / k;
    }
    samples[i] = (2 * amplitude / Math.PI) * sum;
  }

  return { samples, sampleRate, duration, label: `${frequency}Hz sawtooth` };
}

export function generateTriangle(
  frequency: number,
  sampleRate: number,
  duration: number,
  harmonics: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (let k = 0; k < harmonics; k++) {
      const n = 2 * k + 1;
      const sign = k % 2 === 0 ? 1 : -1;
      sum += (sign * Math.sin(2 * Math.PI * frequency * n * t)) / (n * n);
    }
    samples[i] = (8 * amplitude / (Math.PI * Math.PI)) * sum;
  }

  return { samples, sampleRate, duration, label: `${frequency}Hz triangle` };
}

export function generateGaussianPulse(
  center: number,
  sigma: number,
  sampleRate: number,
  duration: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const x = (t - center) / sigma;
    samples[i] = amplitude * Math.exp(-0.5 * x * x);
  }

  return { samples, sampleRate, duration, label: "Gaussian pulse" };
}

export function generateRectangularPulse(
  start: number,
  end: number,
  sampleRate: number,
  duration: number,
  amplitude = 1
): Signal {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = t >= start && t < end ? amplitude : 0;
  }

  return { samples, sampleRate, duration, label: "Rectangular pulse" };
}

export function addSignals(...signals: Signal[]): Signal {
  if (signals.length === 0) {
    throw new Error("At least one signal required");
  }

  const first = signals[0];
  const length = first.samples.length;
  const samples = new Float64Array(length);

  for (const sig of signals) {
    if (sig.samples.length !== length) {
      throw new Error("All signals must have the same length");
    }
    for (let i = 0; i < length; i++) {
      samples[i] += sig.samples[i];
    }
  }

  return {
    samples,
    sampleRate: first.sampleRate,
    duration: first.duration,
    label: signals.map((s) => s.label).join(" + "),
  };
}
