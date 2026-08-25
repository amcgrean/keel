import type { Config } from "tailwindcss";

// Token values ported directly from the Keel design mockup
// (design/keel-mockup.html) so the real app matches it exactly.
export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#22282B",
        "ink-soft": "#5B6469",
        "ink-faint": "#95A0A3",
        paper: "#F3F0E8",
        card: "#FFFFFF",
        line: "#E3DFD2",

        parentA: { DEFAULT: "#45607A", soft: "#DCE4EA", tint: "#EEF2F5" },
        parentB: { DEFAULT: "#7C8F5A", soft: "#E4E9DA", tint: "#F2F4EC" },
        beacon: { DEFAULT: "#B8871F", soft: "#F1E4BC" },
        danger: "#B65A45",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        card: "18px",
        sm: "10px",
      },
    },
  },
  plugins: [],
} satisfies Config;
