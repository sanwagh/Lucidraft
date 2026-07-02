import type { Config } from "tailwindcss";

/**
 * Lucidraft — dark "workbench" identity.
 *
 * Layered neutral grays (elevation = slightly lighter, never glow), hairline
 * white-alpha borders, and monochrome actions: primary buttons are white on
 * dark. Color is reserved for status only — green means an approved prompt,
 * red means an error or a revision.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — near-neutral warm grays, layered by elevation.
        surface: {
          DEFAULT: "#141413", // app ground
          raised: "#1B1B1A", // cards, sidebar, composer
          inset: "#252523", // hovers, user bubbles
          well: "#0F0F0E", // code wells inside cards
        },
        // Hairline borders — white at low alpha.
        line: {
          DEFAULT: "#FFFFFF14",
          strong: "#FFFFFF29",
        },
        // Text — soft white down to faint placeholders.
        ink: {
          DEFAULT: "#EDEDEB",
          soft: "#B9B9B3",
          muted: "#8A8A84",
          faint: "#61615C",
        },
        // Status green — an approved prompt. Never a button color.
        pine: {
          DEFAULT: "#4CAB7D",
          deep: "#2E7D57",
          soft: "#4CAB7D1F",
        },
        // Errors and revision states only.
        red: {
          DEFAULT: "#E5695C",
          deep: "#C94A3D",
          soft: "#E5695C1A",
        },
      },
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          '"Geist Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
