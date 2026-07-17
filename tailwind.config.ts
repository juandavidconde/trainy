import type { Config } from "tailwindcss";

// Design tokens "Volt" — ver trainy-tokens.json (Claude Design, 2026-07)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        bg: "#0D100E",
        surface: "#0D100E", // alias legacy (antes era el fondo)
        card: "#151A16",
        raised: "#1B211C",
        line: "#29312B",
        "line-strong": "#3A443C",
        ink: "#EDF2EC",
        "ink-2": "#A6B0A8",
        "ink-3": "#737D75",
        // Acento
        accent: "#C8F169",
        volt: "#C8F169",
        "volt-pressed": "#AFDA4E",
        "volt-ink": "#131A05",
        // Semánticos
        ok: "#57D993",
        "ok-ink": "#052012",
        err: "#FF6961",
        "err-ink": "#240604",
        warn: "#FFC94D",
        "warn-ink": "#201502",
        // Sesiones
        "s-push": "#FF9A4D",
        "s-pull": "#45D0E8",
        "s-legs": "#A08BFF",
        "s-upper": "#F27DB8",
        "s-lower": "#E5D054",
        "s-full": "#4DDFC0",
        // Grises con tinte verde (reemplazan la escala neutral por defecto)
        neutral: {
          50: "#F4F7F4",
          100: "#EDF2EC",
          200: "#D3DAD4",
          300: "#B9C2BB",
          400: "#A6B0A8",
          500: "#737D75",
          600: "#4A544C",
          700: "#3A443C",
          800: "#29312B",
          900: "#151A16",
          950: "#0D100E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "5px",
        DEFAULT: "7px",
        md: "7px",
        lg: "8px",
        xl: "10px",
        "2xl": "10px", // legacy — las tarjetas viejas usaban 2xl
      },
      boxShadow: {
        floating: "0 10px 30px rgba(0,0,0,0.55)",
        glow: "0 6px 18px rgba(200,241,105,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
