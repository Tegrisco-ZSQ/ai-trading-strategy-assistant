import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#0f172a",
        panel: "#111827",
        accent: "#0284c7",
        glow: "#22d3ee"
      },
      boxShadow: {
        panel: "0 10px 30px rgba(15, 23, 42, 0.2)"
      }
    }
  },
  plugins: []
};

export default config;
