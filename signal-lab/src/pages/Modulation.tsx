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
  drawAxisLabels,
  drawWaveform,
  drawSpectrum,
  defaultRenderParams,
} from "@/renderer/CanvasCore";

const amFormula = katex.renderToString(
  "s_{AM}(t) = [A_c + m(t)] \\cos(2\\pi f_c t)",
  { throwOnError: false }
);

const fmFormula = katex.renderToString(
  "s_{FM}(t) = A_c \\cos\\left(2\\pi f_c t + 2\\pi k_f \\int m(\\tau)d\\tau \\right)",
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
    return modulateFM(carrierFrequency, message(), messageFrequency, sr, modulationIndex);
  }, [modulationType, carrier, message, modulationIndex, carrierFrequency, messageFrequency]);

  const drawThreeWaves = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const params = defaultRenderParams();
      params.viewport = { xMin: 0, xMax: dur, yMin: -2, yMax: 2.5 };
      drawGrid(ctx, params.viewport, w, h, params);
      drawAxes(ctx, params.viewport, w, h, params);
      drawAxisLabels(ctx, params.viewport, w, h, "时间", "幅值", "s", "");

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
      drawAxisLabels(ctx, params.viewport, w, h, "频率", "幅值", "Hz", "");
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
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              为什么要进行调制？
            </div>
            <ul className="text-xs text-lab-text space-y-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-lab-cyan">•</span>
                <span>
                  <strong className="text-lab-cyan font-normal">天线尺寸限制：</strong>
                  有效发射电磁波要求天线长度至少为波长的 1/4。语音信号（如 3kHz）波长达 100 公里，天线无法实现。调制到高频（如 100MHz）后波长缩短为 3 米。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-lab-cyan">•</span>
                <span>
                  <strong className="text-lab-cyan font-normal">频分复用 (FDM)：</strong>
                  如果所有电台都直接发送语音，信号会相互干扰。调制可以将不同电台的信号"搬移"到不同频率（如 90.1MHz、103.9MHz），实现空中互不干扰。
                </span>
              </li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-lab-surface/30 border border-lab-border">
            <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
              {modulationType === "AM" ? "幅度调制 (AM) 公式" : "频率调制 (FM) 公式"}
            </div>
            <div 
              className="text-sm font-mono katex-wrapper mb-3" 
              dangerouslySetInnerHTML={{ __html: modulationType === "AM" ? amFormula : fmFormula }} 
            />
            
            {modulationType === "AM" ? (
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#334466] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#334466] font-mono katex-wrapper" 
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("A_c \\cos(2\\pi f_c t)", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 载波 (Carrier)。f_c 是载波频率，即频谱中心的高频振荡。</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#ff9100] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#ff9100] font-mono katex-wrapper"
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("m(t)", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 调制信号 / 消息 (Message)。即你要发送的低频语音或数据。</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#00e5ff] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#00e5ff] font-mono katex-wrapper"
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("[A_c + m(t)]", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 瞬时幅度。AM 将信息附加在载波的幅度（包络）上。</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#334466] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#334466] font-mono katex-wrapper"
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("f_c", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 载波频率。信号未受调制时的中心频率。</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#ff9100] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#ff9100] font-mono katex-wrapper"
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("m(\\tau)", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 调制信号。它的幅度大小决定了载波频率偏移的程度。</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-lab-bg/40">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-[#00e5ff] mt-1.5" />
                  <div>
                    <span 
                      className="text-xs text-[#00e5ff] font-mono katex-wrapper"
                      dangerouslySetInnerHTML={{ __html: katex.renderToString("k_f \\int m(\\tau)d\\tau", { throwOnError: false }) }}
                    />
                    <span className="text-xs text-lab-muted ml-1">— 相位偏移。FM 调制中，瞬时频率的变化正比于 m(t)，因此总相位是 m(t) 的积分。</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
