# Signal Lab

Signal Lab 是一个交互式的数字信号处理 (DSP) 与通信原理可视化实验平台。通过直观的交互界面和实时渲染的波形图，帮助学习者深入理解抽象的信号与系统概念。

## 🌟 核心功能模块

项目目前涵盖了以下核心领域的交互式图解与模拟：

### 1. 通信原理
* **模拟调制 (AM/FM)**：实时调节载波频率、调制指数等，观察时域波形与频谱（如 Carrier Null 现象）。
* **数字调制星座图 (Constellation)**：支持 BPSK, QPSK, 16QAM 的高斯白噪声 (AWGN) 点云模拟，直观展示 I/Q 正交拆分与判决边界。
* **眼图与码间串扰 (Eye Diagram & ISI)**：交互式展示升余弦滚降滤波器 (Raised Cosine)、奈奎斯特过零点法则、信噪比与时钟抖动对系统误码率的影响。

### 2. 数字信号处理 (DSP)
* **傅里叶变换 (Fourier Series & Transform)**：从方波的谐波合成到吉布斯现象 (Gibbs Phenomenon) 和频谱泄露 (Picket Fence Effect)。
* **离散时间系统**：支持线性卷积、循环卷积过程的逐步图解演示。
* **滤波器设计**：冲激响应与零极点图交互，实时分析系统的频率响应与群延迟。

## 🛠️ 技术栈

* **核心框架**: React 18 + TypeScript + Vite
* **样式与 UI**: Tailwind CSS (自定义黑客实验室科技风格主题)
* **公式渲染**: KaTeX
* **图形渲染**: Canvas 2D API (自主实现的高性能波形与网格绘制引擎)

## 🚀 本地运行与配置指南

### 1. 环境要求
请确保您的电脑上安装了 Node.js（推荐 v18 或更高版本）和 npm。

### 2. 克隆项目
将本仓库克隆到您的本地：
```bash
git clone https://github.com/Dahuangb/signal_lab.git
cd signal_lab/signal-lab
```

### 3. 安装依赖
在 `signal-lab` 目录下执行以下命令，安装项目所需的全部依赖：
```bash
npm install
```

### 4. 启动开发服务器
执行以下命令启动本地开发环境：
```bash
npm run dev
```
启动成功后，终端会输出一个本地访问地址（通常是 `http://localhost:5173`），在浏览器中打开该地址即可开始体验。

### 5. 构建生产版本
如果您想将项目打包并部署到线上环境，可以运行：
```bash
npm run build
```
打包生成的文件将存放在 `signal-lab/dist` 目录下。

## 📁 目录结构说明

```text
signal-lab/
├── src/
│   ├── components/      # 通用 UI 组件 (导航栏库、参数滑块、Canvas 包装器)
│   ├── engine/          # DSP 数学引擎 (卷积计算、傅里叶变换、噪声生成、调制算法)
│   ├── pages/           # 页面级组件 (各个具体的实验模块页面)
│   ├── renderer/        # Canvas 底层绘图核心库 (网格、坐标轴、高频轨迹绘制)
│   ├── store/           # 全局状态管理 (Zustand)
│   ├── App.tsx          # 路由入口与布局定义
│   └── main.tsx         # React 挂载点
├── public/              # 静态资源 (图标等)
└── package.json         # 项目依赖与脚本配置
```

## 🤝 参与贡献

欢迎对信号处理感兴趣的朋友参与贡献。如果您发现了 Bug 或者有新的模块构想，欢迎提交 Issue 或者发起 Pull Request！

## 📄 开源协议

本项目采用 MIT 协议开源。
