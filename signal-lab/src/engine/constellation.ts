export interface ConstellationPoint {
  i: number;
  q: number;
  symbol: string;
}

export type ModulationType = "BPSK" | "QPSK" | "16QAM";

export function generateConstellation(
  type: ModulationType
): ConstellationPoint[] {
  switch (type) {
    case "BPSK":
      return [
        { i: -1, q: 0, symbol: "0" },
        { i: 1, q: 0, symbol: "1" },
      ];
    case "QPSK":
      return [
        { i: -1, q: 1, symbol: "00" },
        { i: -1, q: -1, symbol: "01" },
        { i: 1, q: 1, symbol: "10" },
        { i: 1, q: -1, symbol: "11" },
      ];
    case "16QAM": {
      const levels = [-3, -1, 1, 3];
      const points: ConstellationPoint[] = [];
      for (const q of [...levels].reverse()) {
        for (const i of levels) {
          let bits = "";
          bits += i > 0 ? "1" : "0";
          bits += Math.abs(i) > 1 ? "1" : "0";
          bits += q > 0 ? "1" : "0";
          bits += Math.abs(q) > 1 ? "1" : "0";
          points.push({ i, q, symbol: bits });
        }
      }
      return points;
    }
    default:
      return [];
  }
}

export function addAWGN(
  points: ConstellationPoint[],
  noisePower: number,
  pointsPerSymbol: number = 200
): { i: number; q: number; symbol: string }[] {
  const result: { i: number; q: number; symbol: string }[] = [];
  const std = Math.sqrt(noisePower / 2);

  for (const p of points) {
    for (let k = 0; k < pointsPerSymbol; k++) {
      let u1: number, u2: number, s: number;
      do {
        u1 = 2 * Math.random() - 1;
        u2 = 2 * Math.random() - 1;
        s = u1 * u1 + u2 * u2;
      } while (s >= 1 || s === 0);

      const factor = Math.sqrt((-2 * Math.log(s)) / s);
      result.push({
        i: p.i + u1 * factor * std,
        q: p.q + u2 * factor * std,
        symbol: p.symbol,
      });
    }
  }

  return result;
}

export function generateDecisionBoundaries(
  type: ModulationType
): { horizontal: number[]; vertical: number[] } {
  switch (type) {
    case "BPSK":
      return { horizontal: [], vertical: [0] };
    case "QPSK":
      return { horizontal: [0], vertical: [0] };
    case "16QAM":
      return { horizontal: [-2, 0, 2], vertical: [-2, 0, 2] };
    default:
      return { horizontal: [], vertical: [] };
  }
}

export function generateRandomSymbols(
  type: ModulationType,
  count: number
): number[] {
  const symbols: number[] = [];
  const levels: Record<ModulationType, number> = {
    BPSK: 2,
    QPSK: 4,
    "16QAM": 16,
  };
  const m = levels[type];

  for (let i = 0; i < count; i++) {
    symbols.push(Math.floor(Math.random() * m));
  }
  return symbols;
}
