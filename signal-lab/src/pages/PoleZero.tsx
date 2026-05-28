import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";

type Complex = { re: number; im: number };

const PRESETS: Record<string, { poles: Complex[]; zeros: Complex[]; formula: string }> = {
  lowpass: {
    poles: [{ re: 0.8, im: 0 }],
    zeros: [{ re: -1, im: 0 }],
    formula: "H(z) = \\frac{z + 1}{z - 0.8}",
  },
  highpass: {
    poles: [{ re: -0.8, im: 0 }],
    zeros: [{ re: 1, im: 0 }],
    formula: "H(z) = \\frac{z - 1}{z + 0.8}",
  },
  bandpass: {
    poles: [
      { re: 0.8 * Math.cos(Math.PI / 4), im: 0.8 * Math.sin(Math.PI / 4) },
      { re: 0.8 * Math.cos(Math.PI / 4), im: -0.8 * Math.sin(Math.PI / 4) },
    ],
    zeros: [
      { re: 1, im: 0 },
      { re: -1, im: 0 },
    ],
    formula: "H(z) = \\frac{z^2 - 1}{z^2 - 1.131z + 0.64}",
  },
  notch: {
    poles: [
      { re: 0.8 * Math.cos(Math.PI / 3), im: 0.8 * Math.sin(Math.PI / 3) },
      { re: 0.8 * Math.cos(Math.PI / 3), im: -0.8 * Math.sin(Math.PI / 3) },
    ],
    zeros: [
      { re: Math.cos(Math.PI / 3), im: Math.sin(Math.PI / 3) },
      { re: Math.cos(Math.PI / 3), im: -Math.sin(Math.PI / 3) },
    ],
    formula: "H(z) = \\frac{z^2 - z + 1}{z^2 - 0.8z + 0.64}",
  },
  allpass: {
    poles: [{ re: 0.5, im: 0 }],
    zeros: [{ re: 2, im: 0 }],
    formula: "H(z) = \\frac{z - 2}{z - 0.5}",
  }
};

const REF_POINTS = [
  { omega: 0, color: "#ff3366", label: "0" },
  { omega: Math.PI / 4, color: "#ffaa00", label: "π/4" },
  { omega: Math.PI / 2, color: "#00ff88", label: "π/2" },
  { omega: Math.PI * 3 / 4, color: "#00e5ff", label: "3π/4" },
  { omega: Math.PI, color: "#b066ff", label: "π" },
];

export default function PoleZero() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>("bandpass");

  const { poles, zeros } = PRESETS[preset];

  const drawZPlane = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "Re", "Im", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      // Calculate a square mapping area to enforce 1:1 aspect ratio
      const size = Math.min(drawWidth, drawHeight);
      const offsetX = padding + (drawWidth - size) / 2;
      const offsetY = padding + (drawHeight - size) / 2;

      const mapPoint = (xVal: number, yVal: number) => {
        const x = offsetX + ((xVal - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * size;
        const y = offsetY + size - ((yVal - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * size;
        return { x, y };
      };

      // Draw Unit Circle
      ctx.beginPath();
      const center = mapPoint(0, 0);
      const rightEdge = mapPoint(1, 0);
      const radiusX = Math.abs(rightEdge.x - center.x); // Force absolute distance
      ctx.arc(center.x, center.y, radiusX, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(136, 146, 176, 0.4)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Zeros (o)
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      zeros.forEach((z) => {
        const pt = mapPoint(z.re, -z.im); // Invert Y axis for canvas drawing
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Draw Poles (x)
      ctx.strokeStyle = "#ff9100";
      ctx.lineWidth = 2;
      poles.forEach((p) => {
        const pt = mapPoint(p.re, -p.im); // Invert Y axis for canvas drawing
        const s = 6;
        ctx.beginPath();
        ctx.moveTo(pt.x - s, pt.y - s);
        ctx.lineTo(pt.x + s, pt.y + s);
        ctx.moveTo(pt.x + s, pt.y - s);
        ctx.lineTo(pt.x - s, pt.y + s);
        ctx.stroke();
      });

      // Draw Reference Points
      REF_POINTS.forEach(({ omega, color, label }) => {
        const p = mapPoint(Math.cos(omega), -Math.sin(omega)); // Invert Y axis for canvas drawing
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = "10px JetBrains Mono";
        ctx.fillText(label, p.x + 8, p.y - 8);
      });

      ctx.fillStyle = "rgba(136, 146, 176, 0.8)";
      ctx.font = "12px JetBrains Mono";
      ctx.fillText("单位圆 |z| = 1", center.x + radiusX + 10, center.y - 10);
    },
    [poles, zeros]
  );

  const drawFreqResponse = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const numPts = 200;
      const mags = new Float64Array(numPts + 1);
      let maxMag = 0;

      for (let i = 0; i <= numPts; i++) {
        const omega = (i / numPts) * Math.PI; // 0 to pi
        const zRe = Math.cos(omega);
        const zIm = Math.sin(omega);

        let num = 1;
        zeros.forEach((z) => {
          const dRe = zRe - z.re;
          const dIm = zIm - z.im;
          num *= Math.sqrt(dRe * dRe + dIm * dIm);
        });

        let den = 1;
        poles.forEach((p) => {
          const dRe = zRe - p.re;
          const dIm = zIm - p.im;
          den *= Math.sqrt(dRe * dRe + dIm * dIm);
        });

        const mag = num / den;
        mags[i] = mag;
        if (mag > maxMag) maxMag = mag;
      }

      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: Math.PI, yMin: 0, yMax: maxMag * 1.2 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "频率 ω", "|H(e^jω)|", "rad", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= numPts; i++) {
        const omega = (i / numPts) * Math.PI;
        const mag = mags[i];
        
        const x = padding + (omega / Math.PI) * drawWidth;
        const y = padding + drawHeight - ((mag - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Reference Points on magnitude response
      REF_POINTS.forEach(({ omega, color, label }) => {
        const zRe = Math.cos(omega);
        const zIm = Math.sin(omega);

        let num = 1;
        zeros.forEach((z) => {
          const dRe = zRe - z.re;
          const dIm = zIm - z.im;
          num *= Math.sqrt(dRe * dRe + dIm * dIm);
        });

        let den = 1;
        poles.forEach((p) => {
          const dRe = zRe - p.re;
          const dIm = zIm - p.im;
          den *= Math.sqrt(dRe * dRe + dIm * dIm);
        });

        const mag = num / den;

        const x = padding + (omega / Math.PI) * drawWidth;
        const y = padding + drawHeight - ((mag - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, padding + drawHeight);
        ctx.strokeStyle = color;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = color;
        ctx.font = "10px JetBrains Mono";
        ctx.fillText(label, x - 10, y - 10);
      });

      // Fill area
      ctx.lineTo(padding + drawWidth, padding + drawHeight);
      ctx.lineTo(padding, padding + drawHeight);
      ctx.fillStyle = "rgba(0, 255, 136, 0.1)";
      ctx.fill();
    },
    [poles, zeros]
  );

  const currentPreset = PRESETS[preset];
  const formula = katex.renderToString(currentPreset.formula, { throwOnError: false });
  const zTransformFormula = katex.renderToString("X(z) = \\sum_{n=-\\infty}^{\\infty} x[n] z^{-n}", { throwOnError: false });
  const geomFormula = katex.renderToString("|H(e^{j\\omega})| = \\frac{\\text{到各零点的距离之积}}{\\text{到各极点的距离之积}}", { throwOnError: false });

  const insight = (() => {
    switch (preset) {
      case "lowpass": return "【低通】极点靠近 z=1 (直流，ω=0)，使得低频处的响应被极点'顶起来'；零点在 z=-1 (最高频，ω=π)，将高频响应'钉死'在0。";
      case "highpass": return "【高通】与低通相反，零点在 z=1 抑制直流，极点在 z=-1 提升高频。";
      case "bandpass": return "【带通】极点位于 ω=π/4 附近，在这个频率处产生谐振峰（响应变大）；零点在 0 和 π 抑制了低频和高频。";
      case "notch": return "【陷波】零点正好落在单位圆上的 ω=π/3 处！由于 z 到零点的距离为 0，该频率的响应被绝对'清零'。极点靠近零点用于使得阻带极其狭窄。";
      case "allpass": return "【全通】极点和零点互为共轭倒数。神奇的是，在单位圆上移动时，到零点的距离和到极点的距离之比始终是常数！所以幅频响应是一条直线，它只改变相位。";
    }
  })();

  return (
    <ModuleLayout
      title="零极点分布与频率响应"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              Z 变换的本质
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: zTransformFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              Z 变换中的 <strong className="text-lab-cyan">z 是一个任意的复数</strong>（即 {"$z = r e^{j\\omega}$"}）。<br/>
              • 当 $r=1$ 时（即 {"$z = e^{j\\omega}$"}），我们就<strong>严格站在了单位圆上</strong>，此时 Z 变换就退化成了我们熟悉的离散时间傅里叶变换 (DTFT)。<br/>
              • 为什么不只看单位圆？因为只有在整个复平面上，我们才能找到让多项式等于 0（零点）或无穷大（极点）的位置。它们就像隐藏在二维海面下的海底山脉和海沟，决定了海面（单位圆）上的波浪起伏。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              系统传递函数 H(z)
            </div>
            <div className="text-sm font-mono katex-wrapper mb-3" dangerouslySetInnerHTML={{ __html: formula }} />
            <div className="space-y-2 mt-3">
              <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                <span className="shrink-0 font-mono text-[#00e5ff] font-bold mt-0.5">o</span>
                <div>
                  <span className="text-xs text-[#00e5ff] font-mono">z_k (零点 Zero)</span>
                  <span className="text-xs text-lab-muted ml-1">— 让分子为0。靠近单位圆的零点会把该频率的响应"往下拉"。</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                <span className="shrink-0 font-mono text-[#ff9100] font-bold mt-0.5">x</span>
                <div>
                  <span className="text-xs text-[#ff9100] font-mono">p_k (极点 Pole)</span>
                  <span className="text-xs text-lab-muted ml-1">— 让分母为0。靠近单位圆的极点会把该频率的响应"往上推"（产生谐振）。</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              几何直觉
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: geomFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              想象你沿着虚线<strong className="text-lab-cyan">单位圆</strong>（代表不同的频率 ω）散步。
              当你走近一个<strong className="text-[#ff9100]">极点(x)</strong>时，分母变小，山峰拔地而起；
              当你走近一个<strong className="text-[#00e5ff]">零点(o)</strong>时，分子变小，跌入谷底。
            </p>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <span className="text-xs text-lab-muted">经典滤波器预设</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`py-2 rounded-lg text-xs font-mono transition-all uppercase ${
                  preset === p
                    ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                    : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      }
      insight={insight}
    >
      <div className="flex-1 flex gap-4 h-full">
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            S / Z 平面 (Z-Plane)
          </div>
          <SignalCanvas draw={drawZPlane} height={400} className="w-full h-full min-h-[400px]" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            幅频响应 |H(e^jω)|
          </div>
          <SignalCanvas draw={drawFreqResponse} height={400} className="w-full h-full min-h-[400px]" />
        </div>
      </div>
    </ModuleLayout>
  );
}