/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lab: {
          950: "#06090D", // fondo principal, casi negro con tinte azulado
          900: "#0B1017",
          850: "#0F1620",
          800: "#131C29",
          700: "#1B2635",
          600: "#28394D",
        },
        signal: {
          // cian electrico: color del campo electromagnetico
          400: "#5FE8F2",
          500: "#22D3EE",
          600: "#0FB8D4",
        },
        agent: {
          // violeta: color reservado exclusivamente al Agente de Markov
          400: "#B69CFF",
          500: "#9B7DFF",
          600: "#7C5CF0",
        },
        warn: {
          400: "#FFB86B",
          500: "#FF9B45",
          600: "#F5793A",
        },
        danger: {
          500: "#FF5D5D",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.35)",
        "glow-agent": "0 0 24px rgba(155, 125, 255, 0.35)",
      },
    },
  },
  plugins: [],
};
