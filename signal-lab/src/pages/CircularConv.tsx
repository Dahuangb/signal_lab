import { useCallback, useState } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import { drawGrid, drawAxes, drawAxisLabels, defaultRenderParams } from "@/renderer/CanvasCore";

export default function CircularConv() {
  const [nPoints, setNPoints] = useState(4); // DFT points N

  // Fixed sequences
  const x = [1, 2, 3, 4]; // L = 4
  const h = [1, 1, 1];    // M = 3
  const L = x.length;
  const M = h.length;
  const linearLength = L + M - 1; // 6

  const getLinearConv = () => {
    const y = new Array(linearLength).fill(0);
    for (let n = 0; n < linearLength; n++) {
      for (let k = 0; k < L; k++) {
        if (n - k >= 0 && n - k < M) {
          y[n] += x[k] * h[n - k];
        }
      }
    }
    return y;
  };

  const getCircularConv = (N: number) => {
    const yLinear = getLinearConv();
    const yCirc = new Array(N).fill(0);
    // Aliasing linear conv into circular conv
    for (let n = 0; n < linearLength; n++) {
      yCirc[n % N] += yLinear[n];
    }
    return yCirc;
  };

  const drawLinear = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const y = getLinearConv();
      const params = defaultRenderParams();
      params.viewport = { xMin: -1, xMax: 8, yMin: 0, yMax: 12 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "n", "y_L[n]", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapPoint = (n: number, val: number) => {
        const px = padding + ((n - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
        const py = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        return { px, py };
      };

      const base_y = mapPoint(0, 0).py;

      // Draw stems
      ctx.strokeStyle = "#00e5ff";
      ctx.fillStyle = "#00e5ff";
      ctx.lineWidth = 2;
      for (let n = 0; n < y.length; n++) {
        const { px, py } = mapPoint(n, y[n]);
        ctx.beginPath();
        ctx.moveTo(px, base_y);
        ctx.lineTo(px, py);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Value text
        ctx.font = "10px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText(y[n].toString(), px, py - 8);
      }
      ctx.textAlign = "start";
    },
    []
  );

  const drawCircular = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const yCirc = getCircularConv(nPoints);
      const yLin = getLinearConv();
      
      const params = defaultRenderParams();
      params.viewport = { xMin: -1, xMax: 8, yMin: 0, yMax: 12 };
      
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "n", "y_C[n]", "", "");

      const padding = 40;
      const drawWidth = w - padding * 2;
      const drawHeight = h - padding * 2;

      const mapPoint = (n: number, val: number) => {
        const px = padding + ((n - params.viewport.xMin) / (params.viewport.xMax - params.viewport.xMin)) * drawWidth;
        const py = padding + drawHeight - ((val - params.viewport.yMin) / (params.viewport.yMax - params.viewport.yMin)) * drawHeight;
        return { px, py };
      };

      const base_y = mapPoint(0, 0).py;

      // Highlight the DFT window
      const winStart = mapPoint(-0.5, 0).px;
      const winEnd = mapPoint(nPoints - 0.5, 0).px;
      ctx.fillStyle = "rgba(255, 145, 0, 0.1)";
      ctx.fillRect(winStart, padding, winEnd - winStart, drawHeight);
      ctx.strokeStyle = "rgba(255, 145, 0, 0.3)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(winStart, padding, winEnd - winStart, drawHeight);
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText(`DFT 窗口 (N=${nPoints})`, winStart + 4, padding + 14);

      // Draw stems for Circular
      for (let n = 0; n < nPoints; n++) {
        const { px, py } = mapPoint(n, yCirc[n]);
        
        // If aliased, draw it differently (reddish)
        const isAliased = n < linearLength - nPoints && yLin[n] !== yCirc[n];
        
        ctx.strokeStyle = isAliased ? "#ff3366" : "#ff9100";
        ctx.fillStyle = isAliased ? "#ff3366" : "#ff9100";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(px, base_y);
        ctx.lineTo(px, py);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Value text
        ctx.textAlign = "center";
        ctx.fillText(yCirc[n].toString(), px, py - 8);
        
        // Show formula if aliased
        if (isAliased) {
          ctx.font = "8px JetBrains Mono";
          ctx.fillText(`(${yLin[n]} + ${yLin[n + nPoints] || 0})`, px, py - 20);
        }
      }
      ctx.textAlign = "start";
    },
    [nPoints]
  );

  const lengthFormula = katex.renderToString("N \\ge L + M - 1", { throwOnError: false });
  const aliasFormula = katex.renderToString("y_C[n] = \\sum_{r=-\\infty}^{\\infty} y_L[n + rN]", { throwOnError: false });

  const insight = (() => {
    if (nPoints < linearLength) {
      return `【时域混叠】由于你选的 N=${nPoints} 小于 L+M-1 (${linearLength})，线性卷积的长尾巴（超出的部分）被"绕回"到了前面！比如红色的点，它等于原本的值加上了被绕回来的尾部值，导致结果错误。`;
    }
    return `【安全补零】太棒了！因为 N=${nPoints} ≥ ${linearLength}，线性卷积的尾巴完全被包含在了 DFT 窗口内，没有任何部分被绕回到前面。此时，圆周卷积完全等于线性卷积！`;
  })();

  return (
    <ModuleLayout
      title="圆周卷积 vs 线性卷积"
      formula={
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              已知序列
            </div>
            <ul className="text-xs text-lab-text space-y-2 font-mono">
              <li>x[n] = [1, 2, 3, 4] <span className="text-lab-muted ml-2">(长度 L = 4)</span></li>
              <li>h[n] = [1, 1, 1] <span className="text-lab-muted ml-2">(长度 M = 3)</span></li>
            </ul>
            <p className="text-xs text-lab-text mt-3">
              真实的线性卷积长度应该是：<br/>
              L + M - 1 = 4 + 3 - 1 = <strong className="text-[#00e5ff]">6</strong>
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              混叠定理 (Aliasing)
            </div>
            <div className="text-sm font-mono katex-wrapper mb-2" dangerouslySetInnerHTML={{ __html: aliasFormula }} />
            <p className="text-xs text-lab-text leading-relaxed">
              当我们用计算机（DFT/FFT）计算频域相乘时，系统计算所依赖的参数 $N$ 其实是由<strong className="text-lab-cyan">输入信号的长度</strong>决定的。如果不补零直接做 DFT，$N$ 就只能等于原信号的长度（发生混叠）。
            </p>
            <p className="text-xs text-lab-text leading-relaxed mt-2 border-t border-lab-border/50 pt-2">
              <strong className="text-[#00ff88]">补零的本质作用：</strong><br/>
              线性卷积的长度天然就是 $L+M-1$，这在物理上是固定不变的。<br/>
              为了让系统在计算 DFT 时选择一个足够大的参数 $N$，我们必须人为地在时域末尾补零。补零并没有改变真实的线性卷积，而是<strong className="text-[#00ff88]">强迫计算机扩大它的计算窗口 $N$</strong>，从而满足不混叠条件：
            </p>
            <div className="text-sm font-mono katex-wrapper mt-2 text-[#00ff88]" dangerouslySetInnerHTML={{ __html: lengthFormula }} />
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-lab-muted">DFT 点数 (N)</span>
              <span className={`text-xs font-mono ${nPoints < linearLength ? 'text-[#ff3366]' : 'text-[#00ff88]'}`}>
                {nPoints} {nPoints < linearLength ? "(混叠)" : "(安全)"}
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="8"
              step="1"
              value={nPoints}
              onChange={(e) => setNPoints(Number(e.target.value))}
              className={`accent-${nPoints < linearLength ? '[#ff3366]' : '[#00ff88]'}`}
            />
            <p className="text-[10px] text-lab-muted/70 mt-1">
              拖动滑块改变 DFT 的计算长度 N。观察尾部数据是如何"绕回"前方的。
            </p>
          </div>
        </div>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            真实的线性卷积 (Linear Convolution)
          </div>
          <SignalCanvas draw={drawLinear} height={200} className="w-full" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            DFT 计算的圆周卷积 (Circular Convolution)
          </div>
          <SignalCanvas draw={drawCircular} height={200} className="w-full" />
        </div>
      </div>
    </ModuleLayout>
  );
}