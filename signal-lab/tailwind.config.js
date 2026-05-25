/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        lab: {
          bg: "#0a0e27",
          surface: "#141832",
          border: "#1e2a4a",
          cyan: "#00e5ff",
          green: "#00ff88",
          amber: "#ff9100",
          text: "#e0e0e0",
          muted: "#8892b0",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
