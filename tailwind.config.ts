import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        cream: "rgb(var(--color-cream) / <alpha-value>)",
        brown: "rgb(var(--color-brown) / <alpha-value>)",
        "brown-muted": "rgb(var(--color-brown-muted) / <alpha-value>)",
        terracotta: "rgb(var(--color-terracotta) / <alpha-value>)",
        "terracotta-hover": "rgb(var(--color-terracotta-hover) / <alpha-value>)",
        "terracotta-dark": "rgb(var(--color-terracotta-dark) / <alpha-value>)",
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        "sage-hover": "rgb(var(--color-sage-hover) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        "sand-dark": "rgb(var(--color-sand-dark) / <alpha-value>)",
        "sand-light": "rgb(var(--color-sand-light) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        "success-hover": "rgb(var(--color-success-hover) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        "warning-hover": "rgb(var(--color-warning-hover) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        "error-hover": "rgb(var(--color-error-hover) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        "info-hover": "rgb(var(--color-info-hover) / <alpha-value>)",
        overlay: "rgb(var(--color-overlay) / <alpha-value>)",
      },
      ringColor: {
        DEFAULT: "rgb(var(--color-ring) / <alpha-value>)",
      },
      ringOffsetColor: {
        DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
      },
      borderRadius: {
        "cozy-sm": "8px",
        cozy: "16px",
        "cozy-lg": "24px",
      },
      boxShadow: {
        "cozy-sm": "0 2px 8px rgb(0 0 0 / var(--shadow-opacity-sm))",
        cozy: "0 8px 32px rgb(0 0 0 / var(--shadow-opacity))",
        "cozy-lg": "0 16px 48px rgb(0 0 0 / var(--shadow-opacity-lg))",
      },
      transitionDuration: {
        cozy: "180ms",
      },
      transitionTimingFunction: {
        cozy: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-bottom-2": {
          from: { transform: "translateY(8px)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-top-2": {
          from: { transform: "translateY(-8px)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-bottom-2": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(8px)" },
        },
        "slide-out-to-top-2": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-8px)" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "zoom-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "slide-up": "slide-in-from-bottom-2 0.4s ease-out",
        "slide-down": "slide-in-from-top-2 0.4s ease-out",
        "slide-out-bottom": "slide-out-to-bottom-2 0.2s ease-in",
        "slide-out-top": "slide-out-to-top-2 0.2s ease-in",
        "zoom-in": "zoom-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-out": "zoom-out 0.2s cubic-bezier(0.4, 0, 1, 1)",
      },
    },
  },
  plugins: [],
};

export default config;