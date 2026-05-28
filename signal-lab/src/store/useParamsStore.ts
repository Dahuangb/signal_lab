import { create } from "zustand";

export type SignalType = "square" | "sawtooth" | "triangle";
export type ModulationType = "BPSK" | "QPSK" | "16QAM";

export type AMFMType = "AM" | "FM";

export interface FourierParams {
  signalType: SignalType;
  baseFrequency: number;
  harmonicCount: number;
  hoveredTerm: string | null;
}

export interface ConstellationParams {
  modulationType: ModulationType;
  noisePower: number;
  showDecisionBoundary: boolean;
}

export interface SamplingParams {
  signalFrequency: number;
  sampleFrequency: number;
}

export interface ConvolutionParams {
  signalType1: "rectangular" | "gaussian" | "exponential";
  signalType2: "rectangular" | "gaussian" | "exponential";
  animationProgress: number;
  isPlaying: boolean;
}

export interface ModulationPageParams {
  modulationType: AMFMType;
  carrierFrequency: number;
  messageFrequency: number;
  modulationIndex: number;
}

interface AppState {
  fourier: FourierParams;
  constellation: ConstellationParams;
  sampling: SamplingParams;
  convolution: ConvolutionParams;
  modulation: ModulationPageParams;

  setFourier: (params: Partial<FourierParams>) => void;
  setConstellation: (params: Partial<ConstellationParams>) => void;
  setSampling: (params: Partial<SamplingParams>) => void;
  setConvolution: (params: Partial<ConvolutionParams>) => void;
  setModulation: (params: Partial<ModulationPageParams>) => void;
}

export const useParamsStore = create<AppState>((set) => ({
  fourier: {
    signalType: "square",
    baseFrequency: 1,
    harmonicCount: 5,
    hoveredTerm: null,
  },
  constellation: {
    modulationType: "QPSK",
    noisePower: 0.05,
    showDecisionBoundary: true,
  },
  sampling: {
    signalFrequency: 10,
    sampleFrequency: 25,
  },
  convolution: {
    signalType1: "rectangular",
    signalType2: "rectangular",
    animationProgress: 0,
    isPlaying: false,
  },
  modulation: {
    modulationType: "AM",
    carrierFrequency: 50,
    messageFrequency: 5,
    modulationIndex: 0.5,
  },

  setFourier: (params) =>
    set((state) => ({ fourier: { ...state.fourier, ...params } })),
  setConstellation: (params) =>
    set((state) => ({ constellation: { ...state.constellation, ...params } })),
  setSampling: (params) =>
    set((state) => ({ sampling: { ...state.sampling, ...params } })),
  setConvolution: (params) =>
    set((state) => ({ convolution: { ...state.convolution, ...params } })),
  setModulation: (params) =>
    set((state) => ({ modulation: { ...state.modulation, ...params } })),
}));
