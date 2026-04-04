import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0e0f11",
          secondary: "#1d2023",
          card: "#16181c",
          hover: "#1e2126",
        },
        accent: {
          DEFAULT: "#2850ee",
          hover: "#3360ff",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.05)",
          hover: "rgba(255,255,255,0.12)",
        },
        text: {
          primary: "#ffffff",
          secondary: "#9e9e9e",
          muted: "#7d7d7d",
        },
        green: { DEFAULT: "#22c55e" },
        red: { DEFAULT: "#ef4444" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["DM Sans", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
