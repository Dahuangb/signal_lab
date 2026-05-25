export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface RenderParams {
  viewport: Viewport;
  gridColor: string;
  gridAlpha: number;
  axisColor: string;
  waveColor: string;
  glowColor: string;
  glowEnabled: boolean;
}

export function defaultRenderParams(): RenderParams {
  return {
    viewport: { xMin: 0, xMax: 1, yMin: -1.5, yMax: 1.5 },
    gridColor: "#1e2a4a",
    gridAlpha: 0.5,
    axisColor: "#334466",
    waveColor: "#00e5ff",
    glowColor: "#00e5ff",
    glowEnabled: true,
  };
}

export function worldToScreen(
  wx: number,
  wy: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  padding = 40
): { sx: number; sy: number } {
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  const sx = padding + ((wx - viewport.xMin) / (viewport.xMax - viewport.xMin)) * drawWidth;
  const sy = padding + ((viewport.yMax - wy) / (viewport.yMax - viewport.yMin)) * drawHeight;

  return { sx, sy };
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  params: RenderParams
): void {
  const padding = 40;
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  ctx.strokeStyle = params.gridColor;
  ctx.globalAlpha = params.gridAlpha;
  ctx.lineWidth = 0.5;

  const xGridCount = 10;
  const yGridCount = 8;

  for (let i = 0; i <= xGridCount; i++) {
    const wx = viewport.xMin + ((viewport.xMax - viewport.xMin) * i) / xGridCount;
    const { sx } = worldToScreen(wx, 0, viewport, canvasWidth, canvasHeight, padding);
    ctx.beginPath();
    ctx.moveTo(sx, padding);
    ctx.lineTo(sx, padding + drawHeight);
    ctx.stroke();
  }

  for (let i = 0; i <= yGridCount; i++) {
    const wy = viewport.yMin + ((viewport.yMax - viewport.yMin) * i) / yGridCount;
    const { sy } = worldToScreen(0, wy, viewport, canvasWidth, canvasHeight, padding);
    ctx.beginPath();
    ctx.moveTo(padding, sy);
    ctx.lineTo(padding + drawWidth, sy);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  params: RenderParams
): void {
  const padding = 40;
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  ctx.strokeStyle = params.axisColor;
  ctx.lineWidth = 1;

  const zeroY = worldToScreen(0, 0, viewport, canvasWidth, canvasHeight, padding);
  ctx.beginPath();
  ctx.moveTo(padding, zeroY.sy);
  ctx.lineTo(padding + drawWidth, zeroY.sy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + drawHeight);
  ctx.stroke();
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  samples: Float64Array,
  sampleRate: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  glowColor: string,
  glowEnabled: boolean,
  lineWidth = 2
): void {
  const padding = 40;
  const drawWidth = canvasWidth - padding * 2;

  if (glowEnabled) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";

  ctx.beginPath();
  let firstPoint = true;

  const step = Math.max(1, Math.floor(samples.length / drawWidth));

  for (let i = 0; i < samples.length; i += step) {
    const t = i / sampleRate;
    const { sx, sy } = worldToScreen(t, samples[i], viewport, canvasWidth, canvasHeight, padding);

    if (firstPoint) {
      ctx.moveTo(sx, sy);
      firstPoint = false;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  magnitudes: Float64Array,
  frequencies: Float64Array,
  maxFreq: number,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  glowEnabled: boolean
): void {
  const padding = 40;
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  if (glowEnabled) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const maxMag = Math.max(...Array.from(magnitudes), 0.01);
  const barWidth = Math.max(2, drawWidth / frequencies.length);

  for (let i = 0; i < frequencies.length && frequencies[i] <= maxFreq; i++) {
    const barHeight = (magnitudes[i] / maxMag) * drawHeight;
    const { sx } = worldToScreen(
      frequencies[i],
      0,
      { xMin: 0, xMax: maxFreq, yMin: 0, yMax: maxMag },
      canvasWidth,
      canvasHeight,
      padding
    );

    const topY = canvasHeight - padding - barHeight;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx - barWidth / 2, topY, barWidth, barHeight);
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
