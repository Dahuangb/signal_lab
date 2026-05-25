import { useCallback } from "react";
import katex from "katex";
import ModuleLayout from "@/components/ModuleLayout";
import SignalCanvas from "@/components/SignalCanvas";
import ParamSlider from "@/components/ParamSlider";
import { useParamsStore, AMFMType } from "@/store/useParamsStore";
import { generateSine, generateCosine } from "@/engine/signals";
import { modulateAM, modulateFM } from "@/engine/modulation";
import { computeSpectrum } from "@/engine/fft";
import {
  drawGrid,
  drawAxes,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const modulationFormula = katex.renderToString(
  "s_{AM}(t) = [1 + m \\cdot x(t)] \\cos(\\omega_c t)",
  { throwOnError: false }
);

export default function Modulation() {
  const { modulation, setModulation } = useParamsStore();
  const { modulationType, carrierFrequency, messageFrequency, modulationIndex } =
    modulation;

  const sr = 4096;
  const dur = 0.5;

  const message = useCallback(
    () => generateSine(messageFrequency, sr, dur, 0.8),
    [messageFrequency]
  );
  const carrier = useCallback(
    () => generateCosine(carrierFrequency, sr, dur),
    [carrierFrequency]
  );

  const modulated = useCallback(() => {
    if (modulationType === "AM") {
      return modulateAM(carrier(), message(), modulationIndex);
    }
    return modulateFM(carrierFrequency, message(), sr, modulationIndex);
  }, [modulationType, carrier, message, modulationIndex, carrierFrequency]);

  const drawThreeWaves = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: dur, yMin: -2, yMax: 2.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);

      const msg = message();
      const car = carrier();
      const mod = modulated();

      drawWaveform(
        ctx,
        msg.samples,
        msg.sampleRate,
        params.viewport,
        w,
        h,
        "#ff9100",
        "#ff9100",
        false,
        1.5
      );

      drawWaveform(
        ctx,
        car.samples,
        car.sampleRate,
        params.viewport,
        w,
        h,
        "#334466",
        "#334466",
        false,
        1
      );

      drawWaveform(
        ctx,
        mod.samples,
        mod.sampleRate,
        params.viewport,
        w,
        h,
        "#00e5ff",
        "#00e5ff",
        true,
        2
      );

      const padding = 40;
      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText("调制信号", padding + 4, padding + 14);
      ctx.fillStyle = "#334466";
      ctx.fillText("载波", padding + 4, padding + 28);
      ctx.fillStyle = "#00e5ff";
      ctx.fillText("已调信号", padding + 4, padding + 42);
    },
    [message, carrier, modulated]
  );

  const drawSpectrumView = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      const mod = modulated();
      const spectrum = computeSpectrum(mod.samples, sr);
      const maxFreq = carrierFrequency + messageFrequency * 5;
      params.viewport = {
        xMin: 0,
        xMax: maxFreq,
        yMin: 0,
        yMax: Math.max(0.5, ...Array.from(spectrum.magnitudes.slice(0, 200)).map(v => v * 1.2)),
      };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawSpectrum(
        ctx,
        spectrum.magnitudes,
        spectrum.frequencies,
        maxFreq,
        w,
        h,
        "#00e5ff",
        true
      );

      const padding = 40;
      const drawWidth = w - padding * 2;
      const fcX =
        padding +
        (carrierFrequency / maxFreq) * drawWidth;

      ctx.strokeStyle = "rgba(255, 145, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(fcX, padding);
      ctx.lineTo(fcX, h - padding);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ff9100";
      ctx.font = "10px JetBrains Mono";
      ctx.fillText(`f_c = ${carrierFrequency}Hz`, fcX + 4, padding + 14);

      if (modulationType === "AM") {
        ctx.fillStyle = "#8892b0";
        ctx.font = "10px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.fillText("载波 + 上边带 + 下边带", w / 2, h - padding - 4);
      }
    },
    [modulated, carrierFrequency, messageFrequency, modulationType]
  );

  const insight = (() => {
    if (modulationType === "AM") {
      if (modulationIndex > 1)
        return `调制指数 m=${modulationIndex.toFixed(1)} > 1，发生过调制！包络出现失真，这是 AM 解调失真的原因。`;
      return `AM 调制：调制信号"包裹"在载波外面形成包络。m=${modulationIndex.toFixed(1)} 决定包络的起伏程度。频谱上可以看到载波频率两侧各有一个边带。`;
    }
    return `FM 调制：调制信号改变载波的瞬时频率。β=${modulationIndex.toFixed(1)} 越大，频率偏移越大。FM 的频谱比 AM 复杂得多——边带数量由贝塞尔函数决定。`;
  })();

  return (
    <ModuleLayout
      title="AM / FM 调制"
      formula={
        <div dangerouslySetInnerHTML={{ __html: modulationFormula }} />
      }
      controls={
        <>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-lab-muted">调制类型</span>
            <div className="flex gap-2">
              {(["AM", "FM"] as AMFMType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setModulation({ modulationType: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    modulationType === t
                      ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/40"
                      : "bg-lab-bg text-lab-muted border border-lab-border hover:border-lab-cyan/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ParamSlider
            label="载波频率"
            value={carrierFrequency}
            min={20}
            max={200}
            step={10}
            onChange={(v) => setModulation({ carrierFrequency: v })}
            unit="Hz"
          />
          <ParamSlider
            label="调制信号频率"
            value={messageFrequency}
            min={1}
            max={30}
            step={1}
            onChange={(v) => setModulation({ messageFrequency: v })}
            unit="Hz"
          />
          <ParamSlider
            label="调制指数"
            value={modulationIndex}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => setModulation({ modulationIndex: v })}
          />
          {modulationType === "AM" && modulationIndex > 1 && (
            <div className="p-3 rounded-lg border border-lab-amber/40 bg-lab-amber/5">
              <span className="text-xs text-lab-amber font-mono">
                ⚠ 过调制！m &gt; 1 时包络失真
              </span>
            </div>
          )}
        </>
      }
      insight={insight}
    >
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            三路波形对比
          </div>
          <SignalCanvas draw={drawThreeWaves} height={300} className="w-full" />
        </div>
        <div>
          <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
            已调信号频谱
          </div>
          <SignalCanvas
            draw={drawSpectrumView}
            height={250}
            className="w-full"
          />
        </div>
      </div>
    </ModuleLayout>
  );
}
