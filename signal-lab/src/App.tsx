import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Fourier from "@/pages/Fourier";
import Constellation from "@/pages/Constellation";
import Sampling from "@/pages/Sampling";
import Convolution from "@/pages/Convolution";
import Modulation from "@/pages/Modulation";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fourier" element={<Fourier />} />
        <Route path="/constellation" element={<Constellation />} />
        <Route path="/sampling" element={<Sampling />} />
        <Route path="/convolution" element={<Convolution />} />
        <Route path="/modulation" element={<Modulation />} />
      </Routes>
    </Router>
  );
}
