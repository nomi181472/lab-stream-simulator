import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(224, 71%, 4%)",
        foreground: "hsl(210, 40%, 98%)",
        card: "hsl(222, 47%, 9%)",
        "card-foreground": "hsl(210, 40%, 98%)",
        border: "hsl(217, 33%, 17%)",
        primary: {
          DEFAULT: "#00E5FF", // Neon Cyan
          hover: "#00B8D4",
          dark: "#006064",
        },
        secondary: {
          DEFAULT: "#6366F1", // Indigo
          hover: "#4F46E5",
        },
        accent: {
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
          purple: "#A855F7",
        },
        surface: {
          50: "hsl(222, 47%, 13%)",
          100: "hsl(222, 47%, 11%)",
          200: "hsl(222, 47%, 9%)",
          300: "hsl(224, 71%, 6%)",
          400: "hsl(224, 71%, 4%)",
        },
        muted: {
          DEFAULT: "hsl(217, 19%, 20%)",
          foreground: "hsl(215, 20%, 65%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      backgroundImage: {
        "grid-pattern": "radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        "glow-cyan": "0 0 30px -5px rgba(0, 229, 255, 0.25)",
        "glow-indigo": "0 0 30px -5px rgba(99, 102, 241, 0.25)",
        "glow-emerald": "0 0 30px -5px rgba(16, 185, 129, 0.25)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scanline: "scanline 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
