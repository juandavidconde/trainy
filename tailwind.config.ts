import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta base neutra — cada instancia puede ajustarla
        surface: "#0f1115",
        card: "#181b22",
        accent: "#4f8cff",
      },
    },
  },
  plugins: [],
};

export default config;
