import type { Signal } from "./signals";

export function modulateAM(
  carrier: Signal,
  message: Signal,
  modulationIndex: number
): Signal {
  const length = Math.min(carrier.samples.length, message.samples.length);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    samples[i] = (1 + modulationIndex * message.samples[i]) * carrier.samples[i];
  }

  return {
    samples,
    sampleRate: carrier.sampleRate,
    duration: carrier.duration,
    label: `AM (m=${modulationIndex.toFixed(1)})`,
  };
}

export function modulateFM(
  carrierFreq: number,
  message: Signal,
  messageFreq: number,
  sampleRate: number,
  modulationIndex: number,
  carrierAmplitude = 1
): Signal {
  const length = message.samples.length;
  const samples = new Float64Array(length);
  // freqDeviation = beta * f_m
  const freqDeviation = modulationIndex * messageFreq;
  
  const maxAmp = Math.max(...Array.from(message.samples).map(Math.abs));

  let phase = 0;
  for (let i = 0; i < length; i++) {
    const normalizedMsg = maxAmp === 0 ? 0 : message.samples[i] / maxAmp;
    const instantaneousFreq = carrierFreq + freqDeviation * normalizedMsg;
    phase += (2 * Math.PI * instantaneousFreq) / sampleRate;
    samples[i] = carrierAmplitude * Math.cos(phase);
  }

  return {
    samples,
    sampleRate,
    duration: message.duration,
    label: `FM (β=${modulationIndex.toFixed(1)})`,
  };
}
