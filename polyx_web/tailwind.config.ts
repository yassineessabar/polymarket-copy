import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#080B16",
          secondary: "#111427",
          card: "#141728",
          hover: "#1A1F35",
        },
        accent: {
          DEFAULT: "#3B5BFE",
          hover: "#2A4AED",
          purple: "#6C5CE7",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          hover: "rgba(255,255,255,0.12)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#8B8FA3",
          muted: "#5A5F7A",
        },
        green: { DEFAULT: "#00C853" },
        red: { DEFAULT: "#DC2626" },
        amber: { DEFAULT: "#FFB800" },
        placeholder: "#5A5F7A",
        input: "#1A1F35",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
