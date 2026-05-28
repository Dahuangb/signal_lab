import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Fourier from "@/pages/Fourier";
import FourierLab from "@/pages/FourierLab";
import Gibbs from "@/pages/Gibbs";
import Constellation from "@/pages/Constellation";
import Sampling from "@/pages/Sampling";
import Convolution from "@/pages/Convolution";
import Modulation from "@/pages/Modulation";
import DSP from "@/pages/DSP";
import PicketFence from "@/pages/PicketFence";
import DiscreteTransforms from "@/pages/DiscreteTransforms";
import EyeDiagram from "@/pages/EyeDiagram";
import FilterDesign from "@/pages/FilterDesign";
import PoleZero from "@/pages/PoleZero";
import TransformCompare from "@/pages/TransformCompare";
import CircularConv from "@/pages/CircularConv";
import MatchedFilter from "@/pages/MatchedFilter";
import ImpulseResponse from "@/pages/ImpulseResponse";
import GroupDelay from "@/pages/GroupDelay";
import Shannon from "@/pages/Shannon";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fourier" element={<Fourier />} />
        <Route path="/fourier/lab" element={<FourierLab />} />
        <Route path="/gibbs" element={<Gibbs />} />
        <Route path="/constellation" element={<Constellation />} />
        <Route path="/sampling" element={<Sampling />} />
        <Route path="/convolution" element={<Convolution />} />
        <Route path="/impulse-response" element={<ImpulseResponse />} />
        <Route path="/modulation" element={<Modulation />} />
        <Route path="/dsp" element={<DSP />} />
        <Route path="/picket-fence" element={<PicketFence />} />
        <Route path="/discrete-transforms" element={<DiscreteTransforms />} />
        <Route path="/eye" element={<EyeDiagram />} />
        <Route path="/filter" element={<FilterDesign />} />
        <Route path="/polezero" element={<PoleZero />} />
        <Route path="/transforms" element={<TransformCompare />} />
        <Route path="/circular" element={<CircularConv />} />
        <Route path="/matched" element={<MatchedFilter />} />
        <Route path="/group-delay" element={<GroupDelay />} />
        <Route path="/shannon" element={<Shannon />} />
      </Routes>
    </Router>
  );
}
