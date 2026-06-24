import type { Config } from "tailwindcss";

/**
 * Lucidraft — "Inkwell" identity.
 *
 * A drafting desk for AI-agent prompts: deep ink-blue ground, warm paper-cream
 * type, and a single lamplight-amber accent (the complement of the ink, so it
 * reads as light falling on the desk). Clay is a warm rust used for revisions,
 * deliberately softer than an alarm red.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — deep, blue-leaning ink. Low numbers are darkest.
        ink: {
          950: "#090D17", // sidebar / deepest insets
          900: "#0E1422", // app ground
          850: "#131B2B", // hover / raised
          800: "#172132", // card surface
          750: "#1C2739", // input surface
          700: "#2A3850", // border
          600: "#3A4A66", // strong border / divider
          500: "#55657F", // muted glyphs
          400: "#6E7E9A", // brighter muted glyphs
        },
        // Text — warm creams and taupes, like draft paper under lamplight.
        paper: {
          bright: "#F4EFE3", // headings, wordmark
          DEFAULT: "#D9D3C4", // body text
          dim: "#9A958A", // secondary / labels
          faint: "#6F6B61", // placeholders, very muted
        },
        // Accent — lamplight. The single bold colour.
        lamp: {
          bright: "#F4B65A",
          DEFAULT: "#E9A23B",
          dim: "#C0832E",
          deep: "#7A5520",
        },
        // Revisions / denials — warm rust, not a harsh red.
        clay: {
          bright: "#DD7B55",
          DEFAULT: "#CB6543",
          deep: "#6E3925",
        },
      },
      fontFamily: {
        // UI / body.
        sans: [
          '"Hanken Grotesk"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        // Brand wordmark, eyebrows, and stamps — typewriter-draft character.
        brand: [
          '"Space Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        // Reading mono — used only inside prompt code blocks and paths.
        mono: [
          '"JetBrains Mono"',
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
