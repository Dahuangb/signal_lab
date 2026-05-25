export interface Complex {
  re: number;
  im: number;
}

export interface Spectrum {
  magnitudes: Float64Array;
  phases: Float64Array;
  frequencies: Float64Array;
  resolution: number;
}

function bitReverse(n: number, bits: number): number {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }
  return reversed;
}

export function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  if (n !== imag.length) throw new Error("real and imag arrays must have same length");
  if ((n & (n - 1)) !== 0) throw new Error("length must be power of 2");

  const bits = Math.log2(n);

  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = -2 * Math.PI / size;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const cos = Math.cos(angle * j);
        const sin = Math.sin(angle * j);

        const tr = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin;
        const ti = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos;

        real[i + j + halfSize] = real[i + j] - tr;
        imag[i + j + halfSize] = imag[i + j] - ti;
        real[i + j] += tr;
        imag[i + j] += ti;
      }
    }
  }
}

export function ifft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;

  for (let i = 0; i < n; i++) {
    imag[i] = -imag[i];
  }

  fft(real, imag);

  for (let i = 0; i < n; i++) {
    real[i] /= n;
    imag[i] = -imag[i] / n;
  }
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function computeSpectrum(
  signal: Float64Array,
  sampleRate: number
): Spectrum {
  const n = nextPowerOfTwo(signal.length);
  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  for (let i = 0; i < signal.length; i++) {
    real[i] = signal[i];
  }

  fft(real, imag);

  const halfN = n / 2;
  const magnitudes = new Float64Array(halfN);
  const phases = new Float64Array(halfN);
  const frequencies = new Float64Array(halfN);
  const resolution = sampleRate / n;

  for (let i = 0; i < halfN; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / n;
    phases[i] = Math.atan2(imag[i], real[i]);
    frequencies[i] = i * resolution;
  }

  if (magnitudes[0] > 0) magnitudes[0] /= 2;

  return { magnitudes, phases, frequencies, resolution };
}

export function fftFromSignal(signal: Float64Array): {
  real: Float64Array;
  imag: Float64Array;
} {
  const n = nextPowerOfTwo(signal.length);
  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  for (let i = 0; i < signal.length; i++) {
    real[i] = signal[i];
  }

  fft(real, imag);
  return { real, imag };
}
