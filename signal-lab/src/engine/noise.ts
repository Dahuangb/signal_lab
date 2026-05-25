let gaussianSpare = 0;
let hasSpare = false;

export function generateAWGN(length: number, power: number): Float64Array {
  const samples = new Float64Array(length);
  const std = Math.sqrt(power);

  for (let i = 0; i < length; i++) {
    if (hasSpare) {
      samples[i] = gaussianSpare * std;
      hasSpare = false;
    } else {
      let u1: number, u2: number, s: number;
      do {
        u1 = 2 * Math.random() - 1;
        u2 = 2 * Math.random() - 1;
        s = u1 * u1 + u2 * u2;
      } while (s >= 1 || s === 0);

      const factor = Math.sqrt((-2 * Math.log(s)) / s);
      samples[i] = u1 * factor * std;
      gaussianSpare = u2 * factor;
      hasSpare = true;
    }
  }

  return samples;
}

export function awgn(signal: Float64Array, snrDb: number): Float64Array {
  let signalPower = 0;
  for (let i = 0; i < signal.length; i++) {
    signalPower += signal[i] * signal[i];
  }
  signalPower /= signal.length;

  if (signalPower === 0) {
    return new Float64Array(signal);
  }

  const noisePower = signalPower / Math.pow(10, snrDb / 10);
  const noise = generateAWGN(signal.length, noisePower);

  const result = new Float64Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    result[i] = signal[i] + noise[i];
  }

  return result;
}

export function generateComplexAWGN(
  length: number,
  power: number
): { real: Float64Array; imag: Float64Array } {
  const halfPower = power / 2;
  return {
    real: generateAWGN(length, halfPower),
    imag: generateAWGN(length, halfPower),
  };
}
