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

  // Use the minimum scale to ensure aspect ratio 1:1 if needed, or stick to absolute mapping
  // We'll pass an optional forceSquare parameter later if we want to enforce 1:1

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

export function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  xLabel: string,
  yLabel: string,
  xUnit: string,
  yUnit: string
): void {
  const padding = 40;
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  ctx.fillStyle = "#8892b0";
  ctx.font = "9px JetBrains Mono";
  ctx.textAlign = "center";

  const xTickCount = 5;
  for (let i = 0; i <= xTickCount; i++) {
    const wx = viewport.xMin + ((viewport.xMax - viewport.xMin) * i) / xTickCount;
    const { sx } = worldToScreen(wx, 0, viewport, canvasWidth, canvasHeight, padding);
    const label = Number.isInteger(wx) ? wx.toFixed(0) : wx.toFixed(1);
    ctx.fillText(`${label}${xUnit}`, sx, canvasHeight - padding + 16);
  }

  ctx.textAlign = "end";
  const yTickCount = 4;
  for (let i = 0; i <= yTickCount; i++) {
    const wy = viewport.yMin + ((viewport.yMax - viewport.yMin) * i) / yTickCount;
    const { sy } = worldToScreen(0, wy, viewport, canvasWidth, canvasHeight, padding);
    const label = Number.isInteger(wy) ? wy.toFixed(0) : wy.toFixed(1);
    ctx.fillText(`${label}${yUnit}`, padding - 6, sy + 4);
  }

  ctx.textAlign = "center";
  ctx.fillText(`${xLabel} (${xUnit})`, padding + drawWidth / 2, canvasHeight - padding + 32);

  ctx.save();
  ctx.translate(12, padding + drawHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${yLabel} (${yUnit})`, 0, 0);
  ctx.restore();

  ctx.textAlign = "start";
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

export function drawStem(
  ctx: CanvasRenderingContext2D,
  data: { n: number; val: number }[],
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  glowColor: string,
  glowEnabled: boolean,
  lineWidth = 2,
  radius = 3,
  highlightIndices: Set<number> = new Set()
): void {
  const padding = 40;

  if (glowEnabled) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  
  const zeroY = worldToScreen(0, 0, viewport, canvasWidth, canvasHeight, padding).sy;

  for (let i = 0; i < data.length; i++) {
    const { n, val } = data[i];
    if (n < viewport.xMin || n > viewport.xMax) continue;

    const { sx, sy } = worldToScreen(n, val, viewport, canvasWidth, canvasHeight, padding);

    ctx.beginPath();
    ctx.moveTo(sx, zeroY);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = highlightIndices.has(i) ? "#ff9100" : (val >= 0 ? color : "#ff0033");
    ctx.fill();
    ctx.stroke();
  }

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
