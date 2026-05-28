import { useNavigate } from "react-router-dom";
import katex from "katex";
import { ArrowLeft, ArrowRight, Beaker, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DerivationCard {
  id: string;
  title: string;
  waveform: string;
  color: string;
  borderColor: string;
  bgColor: string;
  formula: string;
  steps: { label: string; latex: string; explanation: string }[];
  resultLatex: string;
  keyInsight: string;
}

const derivations: DerivationCard[] = [
  {
    id: "square",
    title: "方波",
    waveform: "━┓  ━┓  ━┓",
    color: "#00e5ff",
    borderColor: "border-[#00e5ff]/30",
    bgColor: "bg-[#00e5ff]/5",
    formula: "f(t)=\\begin{cases}+1 & 0<t<T/2\\\\-1 & T/2<t<T\\end{cases}",
    steps: [
      {
        label: "1. 计算正弦系数 bn",
        latex: "b_n=\\frac{2}{T}\\int_{0}^{T}f(t)\\sin(n\\omega t)dt",
        explanation:
          "方波是奇函数，只有正弦项系数 bn（余弦项 an = 0）。T 是周期，ω = 2π/T。",
      },
      {
        label: "2. 代入 f(t) 分段积分",
        latex:
          "b_n=\\frac{2}{T}\\left[\\int_{0}^{T/2}(+1)\\sin(n\\omega t)dt+\\int_{T/2}^{T}(-1)\\sin(n\\omega t)dt\\right]",
        explanation:
          "方波前半周期为 +1，后半周期为 -1，分段代入积分。",
      },
      {
        label: "3. 计算积分 — 关键！",
        latex: "b_n=\\frac{2}{n\\pi}\\big(1-\\cos(n\\pi)\\big)",
        explanation:
          "积分后得到 2(1-cos(nπ))/(nπ)。当 n 为偶数时 cos(nπ)=1 → bn=0（偶次谐波消失）。当 n 为奇数时 cos(nπ)=-1 → bn=4/(nπ)。",
      },
      {
        label: "4. 仅奇次谐波非零",
        latex: "b_n=\\begin{cases}\\frac{4}{n\\pi} & n=1,3,5,7,\\dots\\\\0 & n=2,4,6,\\dots\\end{cases}",
        explanation:
          "这就是为什么方波只有奇次谐波！偶次项因为 cos(nπ)=1 而恰好抵消。系数按 1/n 递减 — 第 3 次谐波幅度是基波的 1/3。",
      },
    ],
    resultLatex:
      "f_{\\text{方波}}(t)=\\frac{4}{\\pi}\\sum_{k=1}^{\\infty}\\frac{\\sin\\big((2k-1)\\omega t\\big)}{2k-1}",
    keyInsight:
      "cos(nπ) 在 n 为偶数时 = 1，导致 bn=0 — 这就是方波「没有偶次谐波」的数学根源。",
  },
  {
    id: "sawtooth",
    title: "锯齿波",
    waveform: "╱│╱│╱│",
    color: "#ff9100",
    borderColor: "border-[#ff9100]/30",
    bgColor: "bg-[#ff9100]/5",
    formula: "f(t)=\\frac{2}{T}t-1\\quad(0<t<T)",
    steps: [
      {
        label: "1. 计算正弦系数 bn",
        latex: "b_n=\\frac{2}{T}\\int_{0}^{T}f(t)\\sin(n\\omega t)dt",
        explanation:
          "锯齿波也是奇函数，同样只有正弦项。代入 f(t)=2t/T-1。",
      },
      {
        label: "2. 代入积分",
        latex: "b_n=\\frac{2}{T}\\int_{0}^{T}\\left(\\frac{2t}{T}-1\\right)\\sin(n\\omega t)dt",
        explanation:
          "f(t)=2t/T-1 是一个线性斜坡函数。",
      },
      {
        label: "3. 分部积分 — 关键！",
        latex: "b_n=-\\frac{2}{n\\pi}",
        explanation:
          "积分后得到 -2/(nπ)。与方波不同，这里没有 cos(nπ) 项 — 所以 n 为偶数时系数也不为零！所有 n=1,2,3,4,… 的谐波都存在。",
      },
      {
        label: "4. 所有谐波都存在",
        latex: "b_n=-\\frac{2}{n\\pi}\\quad n=1,2,3,4,\\dots",
        explanation:
          "锯齿波包含所有谐波（奇次+偶次），因为它的 f(t) 没有半波对称性。系数仍按 1/n 递减 — 第 2 次谐波是基波的一半，第 10 次是 1/10。",
      },
    ],
    resultLatex:
      "f_{\\text{锯齿}}(t)=\\frac{2}{\\pi}\\sum_{k=1}^{\\infty}(-1)^{k+1}\\frac{\\sin(k\\omega t)}{k}",
    keyInsight:
      "锯齿波没有半波对称性，积分结果不含 cos(nπ) 因子 — 所以偶次谐波不会消去，频谱上每个整数倍频率都有峰。",
  },
  {
    id: "triangle",
    title: "三角波",
    waveform: "╱╲╱╲",
    color: "#00ff88",
    borderColor: "border-[#00ff88]/30",
    bgColor: "bg-[#00ff88]/5",
    formula: "f(t)=\\begin{cases}\\frac{4}{T}t-1 & 0<t<T/2\\\\3-\\frac{4}{T}t & T/2<t<T\\end{cases}",
    steps: [
      {
        label: "1. 计算正弦系数 bn",
        latex: "b_n=\\frac{2}{T}\\int_{0}^{T}f(t)\\sin(n\\omega t)dt",
        explanation:
          "三角波是奇函数 + 半波对称，所以只有奇次正弦项。",
      },
      {
        label: "2. 分段代入 + 分部积分",
        latex: "b_n=\\frac{8}{n^2\\pi^2}\\sin\\!\\left(\\frac{n\\pi}{2}\\right)",
        explanation:
          "由于 f(t) 本身是一次积分的结果，再积分一次会多出一个 1/n 因子。所以系数中出现 1/n²。",
      },
      {
        label: "3. 只有奇次谐波非零",
        latex: "b_n=\\begin{cases}\\frac{8}{n^2\\pi^2} & n=1,5,9,\\dots\\\\-\\frac{8}{n^2\\pi^2} & n=3,7,11,\\dots\\\\0 & n\\text{ 偶数}\\end{cases}",
        explanation:
          "sin(nπ/2) 在 n 为偶数时 = 0（偶次消失）。奇次项中，n=1,5,9… 为正，n=3,7,11… 为负。",
      },
      {
        label: "4. 系数按 1/n² 衰减",
        latex: "|b_n|=\\frac{8}{n^2\\pi^2}",
        explanation:
          "三角波的幅度按 1/n² 衰减 — 远快于方波和锯齿波的 1/n。第 3 次谐波幅度仅为基波的 1/9，所以三角波只需很少谐波就能完美逼近。",
      },
    ],
    resultLatex:
      "f_{\\text{三角}}(t)=\\frac{8}{\\pi^2}\\sum_{k=0}^{\\infty}\\frac{(-1)^k\\sin\\big((2k+1)\\omega t\\big)}{(2k+1)^2}",
    keyInsight:
      "三角波是方波的积分 — 积分操作在频域中相当于除以 n，所以系数从 1/n 变成了 1/n²。收敛极快，几乎看不到吉布斯现象。",
  },
];

function DerivationStep({
  step,
  isLast,
}: {
  step: DerivationCard["steps"][0];
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0"
          style={{ background: "#1e2a4a", color: "#00e5ff" }}
        >
          {step.label.charAt(0)}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#1e2a4a] my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-xs text-[#00e5ff] font-mono mb-1">{step.label}</div>
        <div
          className="text-sm font-mono katex-wrapper mb-2 p-2 rounded bg-[#0a0e27]"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(step.latex, { throwOnError: false }),
          }}
        />
        <p className="text-xs text-lab-muted leading-relaxed">
          {step.explanation}
        </p>
      </div>
    </div>
  );
}

const BASE_FORMULA_LATEX = katex.renderToString(
  "f(t)=a_0+\\sum_{n=1}^{\\infty}\\big[a_n\\cos(n\\omega t)+b_n\\sin(n\\omega t)\\big]",
  { throwOnError: false }
);

export default function Fourier() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>("square");

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-lab-border bg-lab-surface/50">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg hover:bg-lab-border/50 transition-colors text-lab-muted hover:text-lab-cyan"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-mono text-[#00e5ff] tracking-wide">
          傅里叶级数推导
        </h1>
        <span className="text-xs text-lab-muted font-mono">
          点击展开各波形的推导过程
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate("/fourier/lab")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff] text-sm font-mono hover:bg-[#00e5ff]/25 transition-colors"
          >
            <Beaker size={16} />
            动手实验
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-mono text-lab-text mb-2">
            傅里叶级数的核心思想
          </h2>
          <p className="text-sm text-lab-muted leading-relaxed max-w-2xl mb-4">
            任何周期信号都可以分解为一系列正弦波的加权和。每个正弦波的频率是基频的整数倍（谐波），
            幅度由<b>傅里叶系数</b>决定。下面通过三种经典波形，一步步展示系数是如何通过积分推导出来的。
          </p>

          <div className="p-5 rounded-xl border border-[#00e5ff]/20 bg-[#00e5ff]/3">
            <div className="text-xs text-[#00e5ff] mb-3 font-mono uppercase tracking-wider">
              傅里叶级数基础公式
            </div>
            <div
              className="text-base font-mono katex-wrapper mb-4"
              dangerouslySetInnerHTML={{ __html: BASE_FORMULA_LATEX }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="p-3 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
                <div className="text-xs text-[#00e5ff] font-mono mb-1">
                  直流分量 a₀
                </div>
                <div
                  className="text-xs font-mono katex-wrapper"
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(
                      "a_0=\\frac{1}{T}\\int_{0}^{T}f(t)dt",
                      { throwOnError: false }
                    ),
                  }}
                />
                <p className="text-xs text-lab-muted mt-1">
                  信号在一个周期内的平均值。奇函数信号（方波、锯齿波、三角波）的 a₀ = 0。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
                <div className="text-xs text-[#00ff88] font-mono mb-1">
                  余弦系数 aₙ
                </div>
                <div
                  className="text-xs font-mono katex-wrapper"
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(
                      "a_n=\\frac{2}{T}\\int_{0}^{T}f(t)\\cos(n\\omega t)dt",
                      { throwOnError: false }
                    ),
                  }}
                />
                <p className="text-xs text-lab-muted mt-1">
                  衡量信号与 cos(nωt) 的"相似度"。奇函数信号的所有 aₙ = 0。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
                <div className="text-xs text-[#ff9100] font-mono mb-1">
                  正弦系数 bₙ
                </div>
                <div
                  className="text-xs font-mono katex-wrapper"
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(
                      "b_n=\\frac{2}{T}\\int_{0}^{T}f(t)\\sin(n\\omega t)dt",
                      { throwOnError: false }
                    ),
                  }}
                />
                <p className="text-xs text-lab-muted mt-1">
                  衡量信号与 sin(nωt) 的"相似度"。下面的三种波形都靠 bₙ 来描述。
                </p>
              </div>
            </div>

            <p className="text-xs text-lab-muted mt-3 leading-relaxed">
              <span className="text-[#00e5ff] font-mono">奇函数</span>（f(-t) = -f(t)）的所有 aₙ = 0，
              只有 bₙ 项。方波、锯齿波、三角波都是奇函数，所以它们的推导都从计算 bₙ 开始。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {derivations.map((card) => {
            const isOpen = expanded === card.id;
            return (
              <div
                key={card.id}
                className={`rounded-xl border ${card.borderColor} ${card.bgColor} overflow-hidden transition-all`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : card.id)}
                  className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono"
                    style={{ background: `${card.color}15`, color: card.color }}
                  >
                    {card.waveform}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-mono font-semibold" style={{ color: card.color }}>
                        {card.title}
                      </h3>
                      <div
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: `${card.color}15`, color: card.color }}
                      >
                        {card.keyInsight.length > 30
                          ? card.keyInsight.slice(0, 30) + "…"
                          : card.keyInsight}
                      </div>
                    </div>
                    <div
                      className="text-sm font-mono katex-wrapper mt-2"
                      dangerouslySetInnerHTML={{
                        __html: katex.renderToString(card.formula, {
                          throwOnError: false,
                        }),
                      }}
                    />
                  </div>
                  {isOpen ? (
                    <ChevronUp size={20} className="text-lab-muted shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-lab-muted shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 border-t border-[#1e2a4a] pt-5">
                    <div className="mb-5 p-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
                      <div className="text-xs text-lab-muted mb-2 font-mono uppercase tracking-wider">
                        推导结果
                      </div>
                      <div
                        className="text-sm font-mono katex-wrapper"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(card.resultLatex, {
                            throwOnError: false,
                          }),
                        }}
                      />
                    </div>

                    <div className="space-y-0">
                      {card.steps.map((step, idx) => (
                        <DerivationStep
                          key={idx}
                          step={step}
                          isLast={idx === card.steps.length - 1}
                        />
                      ))}
                    </div>

                    <div
                      className="mt-5 p-4 rounded-lg border"
                      style={{
                        borderColor: `${card.color}30`,
                        background: `${card.color}08`,
                      }}
                    >
                      <div
                        className="text-xs font-mono uppercase tracking-wider mb-1"
                        style={{ color: card.color }}
                      >
                        关键洞察
                      </div>
                      <p className="text-sm text-lab-text leading-relaxed">
                        {card.keyInsight}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 rounded-xl border border-[#1e2a4a] bg-lab-surface/20">
          <h3 className="text-lg font-mono text-lab-text mb-3">
            为什么锯齿波的幅度按 1/n 递减？
          </h3>
          <p className="text-sm text-lab-muted leading-relaxed mb-3">
            这是理解傅里叶级数的关键问题。答案在于积分运算本身：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
              <div className="text-xs text-[#ff9100] font-mono mb-2">锯齿波</div>
              <div className="text-sm font-mono katex-wrapper mb-2">
                <span dangerouslySetInnerHTML={{
                  __html: katex.renderToString("b_n = -\\frac{2}{n\\pi}", { throwOnError: false })
                }} />
              </div>
              <p className="text-xs text-lab-muted leading-relaxed">
                ∫ t·sin(nωt) dt → 分部积分产生 1/n 因子。系数按 1/n 衰减 — 第 10 次谐波是基波的 1/10。
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
              <div className="text-xs text-[#00e5ff] font-mono mb-2">方波</div>
              <div className="text-sm font-mono katex-wrapper mb-2">
                <span dangerouslySetInnerHTML={{
                  __html: katex.renderToString("b_n = \\frac{4}{n\\pi}\\ (n\\text{ 奇数})", { throwOnError: false })
                }} />
              </div>
              <p className="text-xs text-lab-muted leading-relaxed">
                ∫ 常数·sin(nωt) dt → 同样产生 1/n 因子。但只有奇数 n 非零，因 cos(nπ) 筛选。
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a]">
              <div className="text-xs text-[#00ff88] font-mono mb-2">三角波</div>
              <div className="text-sm font-mono katex-wrapper mb-2">
                <span dangerouslySetInnerHTML={{
                  __html: katex.renderToString("b_n = \\frac{8}{n^2\\pi^2}\\ (n\\text{ 奇数})", { throwOnError: false })
                }} />
              </div>
              <p className="text-xs text-lab-muted leading-relaxed">
                三角波是方波的积分 → 再积一次 → 多一个 1/n → 1/n² 衰减。收敛极快！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
