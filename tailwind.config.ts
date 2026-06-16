import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        cream: "rgb(var(--color-cream) / <alpha-value>)",
        brown: "rgb(var(--color-brown) / <alpha-value>)",
        "brown-muted": "rgb(var(--color-brown-muted) / <alpha-value>)",
        terracotta: "rgb(var(--color-terracotta) / <alpha-value>)",
        "terracotta-hover": "rgb(var(--color-terracotta-hover) / <alpha-value>)",
        "terracotta-dark": "#a85c3a",
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        "sand-dark": "#d9cfc2",
        "sand-light": "#f5f0e8",
      },
      borderRadius: {
        cozy: "16px",
      },
      boxShadow: {
        cozy: "0 8px 32px rgba(0, 0, 0, 0.04)",
      },
      transitionDuration: {
        cozy: "180ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-from-bottom-2": {
          from: { transform: "translateY(8px)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-top-2": {
          from: { transform: "translateY(-8px)" },
          to: { transform: "translateY(0)" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-in-from-bottom-2 0.4s ease-out",
        "slide-down": "slide-in-from-top-2 0.4s ease-out",
        "zoom-in": "zoom-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
