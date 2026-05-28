import { useCallback } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import {
  drawAxes,
  defaultRenderParams,
  worldToScreen,
  drawStem,
} from "@/renderer/CanvasCore";

export default function DiscreteTransforms() {
  const drawCtftTime = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -5, xMax: 5, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    ctx.beginPath();
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    for(let i=0; i<=w; i++) {
      const t = p.viewport.xMin + (i/w)*(p.viewport.xMax - p.viewport.xMin);
      const val = Math.exp(-t*t/2);
      const { sx, sy } = worldToScreen(t, val, p.viewport, w, h, 40);
      if(i===0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    
    ctx.fillStyle = "#00e5ff";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("x(t)", 40, 30);
  }, []);

  const drawCtftFreq = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -15, xMax: 15, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    const drawTriangle = (center: number, color: string) => {
      const { sx: xC, sy: yT } = worldToScreen(center, 1, p.viewport, w, h, 40);
      const { sx: xL, sy: yB } = worldToScreen(center - 4, 0, p.viewport, w, h, 40);
      const { sx: xR } = worldToScreen(center + 4, 0, p.viewport, w, h, 40);
      
      ctx.beginPath();
      ctx.moveTo(xL, yB);
      ctx.lineTo(xC, yT);
      ctx.lineTo(xR, yB);
      ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    
    drawTriangle(0, "#00e5ff");
    
    ctx.fillStyle = "#00e5ff";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("X(f)", 40, 30);
  }, []);

  const drawDtftTime = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -5, xMax: 5, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    const data = [];
    for(let n = -5; n <= 5; n++) {
      data.push({ n, val: Math.exp(-n*n/2) });
    }
    drawStem(ctx, data, p.viewport, w, h, "#00ff88", "#00ff88", true, 2, 3);
    
    ctx.fillStyle = "#00ff88";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("x[n]", 40, 30);
  }, []);

  const drawDtftFreq = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -15, xMax: 15, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    const drawTriangle = (center: number, color: string, alpha: number) => {
      const { sx: xC, sy: yT } = worldToScreen(center, 1, p.viewport, w, h, 40);
      const { sx: xL, sy: yB } = worldToScreen(center - 4, 0, p.viewport, w, h, 40);
      const { sx: xR } = worldToScreen(center + 4, 0, p.viewport, w, h, 40);
      
      ctx.beginPath();
      ctx.moveTo(xL, yB);
      ctx.lineTo(xC, yT);
      ctx.lineTo(xR, yB);
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    
    drawTriangle(-10, "#00ff88", 0.05);
    drawTriangle(10, "#00ff88", 0.05);
    drawTriangle(0, "#00ff88", 0.2); // Baseband
    
    ctx.fillStyle = "#00ff88";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("X(e^jω)", 40, 30);
  }, []);

  const drawDftTime = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -5, xMax: 5, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    const data = [];
    for(let n = -5; n <= 5; n++) {
      if (n >= -2 && n <= 2) {
        data.push({ n, val: Math.exp(-n*n/2) });
      } else {
        data.push({ n, val: 0 });
      }
    }
    drawStem(ctx, data, p.viewport, w, h, "#ff9100", "#ff9100", true, 2, 3);
    
    // Highlight the window
    const { sx: xL } = worldToScreen(-2.5, 0, p.viewport, w, h, 40);
    const { sx: xR } = worldToScreen(2.5, 0, p.viewport, w, h, 40);
    const { sy: yT } = worldToScreen(0, 1.1, p.viewport, w, h, 40);
    const { sy: yB } = worldToScreen(0, -0.1, p.viewport, w, h, 40);
    ctx.fillStyle = "rgba(255, 145, 0, 0.1)";
    ctx.fillRect(xL, yT, xR - xL, yB - yT);
    
    ctx.fillStyle = "#ff9100";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("x[n] 截断", 40, 30);
  }, []);

  const drawDftFreq = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = defaultRenderParams();
    p.viewport = { xMin: -15, xMax: 15, yMin: -0.2, yMax: 1.2 };
    drawAxes(ctx, p.viewport, w, h, p);
    
    const data = [];
    for(let k = -15; k <= 15; k += 1.5) {
      let val = 0;
      const centers = [-10, 0, 10];
      for (const c of centers) {
        if (Math.abs(k - c) <= 4) {
          val = Math.max(val, 1 - Math.abs(k - c)/4);
        }
      }
      data.push({ n: k, val });
    }
    drawStem(ctx, data, p.viewport, w, h, "#ff9100", "#ff9100", true, 2, 2);
    
    ctx.fillStyle = "#ff9100";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("X[k] 离散采样", 40, 30);
  }, []);

  const dtftKatex = katex.renderToString("X(e^{j\\omega}) = \\sum_{n=-\\infty}^{\\infty} x[n]e^{-j\\omega n}", { throwOnError: false });
  const dftKatex = katex.renderToString("X[k] = \\sum_{n=0}^{N-1} x[n]e^{-j\\frac{2\\pi}{N}kn}", { throwOnError: false });

  return (
    <ModuleLayout
      title="DFT vs DTFT vs FFT"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              三大变换的核心区别
            </div>
            <ul className="text-xs text-lab-text space-y-4 leading-relaxed">
              <li>
                <strong className="text-lab-cyan">FT (傅里叶变换)：</strong> 
                处理连续时间、无限长信号。频域是连续的、非周期的。
              </li>
              <li>
                <strong className="text-[#00ff88]">DTFT (离散时间傅里叶变换)：</strong> 
                时域被采样（离散），导致频域变成<span className="text-[#00ff88]">周期性</span>的。但它仍然要求信号是无限长的，所以频域还是连续的。
                <div className="mt-2 text-sm font-mono katex-wrapper" dangerouslySetInnerHTML={{ __html: dtftKatex }} />
              </li>
              <li>
                <strong className="text-[#ff9100]">DFT (离散傅里叶变换)：</strong> 
                计算机无法计算无限长、连续的频谱。我们将时域截断为 N 点，并在频域进行 N 点采样。此时时域和频域都是<span className="text-[#ff9100]">离散且有限的</span>。
                <div className="mt-2 text-sm font-mono katex-wrapper" dangerouslySetInnerHTML={{ __html: dftKatex }} />
              </li>
              <li>
                <strong className="text-lab-amber">FFT (快速傅里叶变换)：</strong> 
                不是一种新的变换！它只是计算 DFT 的一种<span className="text-lab-amber">极其高效的算法</span>，利用蝶形运算将复杂度从 O(N²) 降到了 O(N log N)。
              </li>
            </ul>
          </div>
        </div>
      }
      controls={
        <div className="p-4 rounded-lg bg-lab-bg/50 border border-lab-border text-sm text-lab-muted leading-relaxed text-center mt-10">
          <p>从 FT 到 DTFT 再到 DFT，是理论向工程妥协的必然过程。</p>
          <p className="mt-2">由于计算机的内存和计算能力有限，我们不得不引入<strong className="text-lab-cyan">时域采样</strong>（导致频域周期化）和<strong className="text-lab-amber">时域截断</strong>（导致频谱泄漏），最后引入<strong className="text-[#00ff88]">频域采样</strong>（导致栅栏效应），最终得到了可以在计算机中运行的 DFT。</p>
        </div>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-lab-bg/30 rounded-xl border border-lab-border/30">
        <div className="max-w-2xl w-full space-y-12">
          
          <div className="relative border-l-2 border-lab-cyan/30 pl-8 pb-4">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-lab-bg border-2 border-lab-cyan"></div>
            <h3 className="text-xl font-bold text-lab-text mb-2 flex items-center gap-2">
              1. 连续时间傅里叶变换 (CTFT)
            </h3>
            <p className="text-sm text-lab-muted mb-4">时间连续且无限长 ⇔ 频率连续且非周期</p>
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
              <div className="flex-1 w-full border border-lab-cyan/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawCtftTime} width={280} height={160} className="w-full" />
              </div>
              <div className="text-lab-cyan font-bold text-2xl hidden xl:block">⇔</div>
              <div className="text-lab-cyan font-bold text-2xl xl:hidden">⇕</div>
              <div className="flex-1 w-full border border-lab-cyan/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawCtftFreq} width={280} height={160} className="w-full" />
              </div>
            </div>
          </div>

          <div className="relative border-l-2 border-[#00ff88]/30 pl-8 pb-4">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-lab-bg border-2 border-[#00ff88]"></div>
            <h3 className="text-xl font-bold text-lab-text mb-2 flex items-center gap-2">
              2. 离散时间傅里叶变换 (DTFT)
            </h3>
            <p className="text-sm text-lab-muted mb-4">时间离散(采样) ⇔ <strong className="text-[#00ff88]">频率周期延拓</strong></p>
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
              <div className="flex-1 w-full border border-[#00ff88]/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawDtftTime} width={280} height={160} className="w-full" />
              </div>
              <div className="text-[#00ff88] font-bold text-2xl hidden xl:block">⇔</div>
              <div className="text-[#00ff88] font-bold text-2xl xl:hidden">⇕</div>
              <div className="flex-1 w-full border border-[#00ff88]/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawDtftFreq} width={280} height={160} className="w-full" />
              </div>
            </div>
          </div>

          <div className="relative pl-8">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-lab-bg border-2 border-[#ff9100]"></div>
            <h3 className="text-xl font-bold text-lab-text mb-2 flex items-center gap-2">
              3. 离散傅里叶变换 (DFT)
            </h3>
            <p className="text-sm text-lab-muted mb-4">时间截断(有限长) ⇔ <strong className="text-[#ff9100]">频率离散(采样)</strong></p>
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
              <div className="flex-1 w-full border border-[#ff9100]/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawDftTime} width={280} height={160} className="w-full" />
              </div>
              <div className="text-[#ff9100] font-bold text-2xl hidden xl:block">⇔</div>
              <div className="text-[#ff9100] font-bold text-2xl xl:hidden">⇕</div>
              <div className="flex-1 w-full border border-[#ff9100]/20 rounded-lg overflow-hidden bg-lab-surface/20">
                <SignalCanvas draw={drawDftFreq} width={280} height={160} className="w-full" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </ModuleLayout>
  );
}
