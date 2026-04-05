import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#F7F7F7",
          secondary: "#F0F0F0",
          card: "#FFFFFF",
          hover: "#EBEBEB",
        },
        accent: {
          DEFAULT: "#121212",
          hover: "#333333",
        },
        border: {
          DEFAULT: "rgba(0,0,0,0.08)",
          hover: "rgba(0,0,0,0.15)",
        },
        text: {
          primary: "#121212",
          secondary: "#9B9B9B",
          muted: "#656565",
        },
        green: { DEFAULT: "#009D55" },
        red: { DEFAULT: "#DC2626" },
        placeholder: "#BFBFBF",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
