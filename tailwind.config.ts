import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Kettle brand system: warm editorial palette built for a kitchen operator's
// dashboard — parchment page, espresso ink, a confident terracotta accent,
// and a brass secondary for quiet luxury touches (rules, focus glows).
// Every text/background and non-text (border/icon) pairing actually used in
// components/ui and app/ was run through a real WCAG contrast calculation
// (relative luminance, not eyeballed) — 4.5:1 for normal text, 3:1 for large
// text and non-text UI component boundaries.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF5EC",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#2A1F17",
          muted: "#6B5847",
          // #7A6656 measures 5.01:1 on paper / 5.44:1 on white — clears the
          // 4.5:1 AA floor for the lightest secondary/placeholder text tier.
          subtle: "#7A6656",
        },
        line: {
          DEFAULT: "#E7DCC9",
          // Decorative/structural borders (Card, dividers, dashed empty-state
          // outlines) keep the lighter DEFAULT. Interactive component edges
          // (inputs/selects/checkboxes) use `strong`, which measures 3.34:1 on
          // white / 3.07:1 on paper — clears the 3:1 AA floor for UI boundaries.
          strong: "#9C8A73",
        },
        accent: {
          50: "#FBEAE0",
          100: "#F5D2BE",
          200: "#E9AD85",
          300: "#DC8B5D",
          400: "#D97847",
          500: "#C4592F",
          600: "#A8471F",
          700: "#82361A",
          // #82361A measures 8.43:1 on white — comfortably clears 4.5:1 for
          // accent-colored body text (links, emphasis).
          DEFAULT: "#A8471F",
        },
        brass: {
          50: "#F6EFDE",
          200: "#E4CE94",
          400: "#C6A053",
          600: "#9C7A32",
          // #8A6A2A measures 5.03:1 on white — clears 4.5:1 where brass is
          // used as text (rare; mostly decorative rules/glows).
          700: "#8A6A2A",
        },
        success: {
          50: colors.emerald[50],
          100: colors.emerald[100],
          600: colors.emerald[600],
          700: colors.emerald[700],
        },
        danger: {
          50: colors.red[50],
          100: colors.red[100],
          600: colors.red[600],
          700: colors.red[700],
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        // Today's cook-count numerals — legible at arm's length in a kitchen.
        stat: ["2.75rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        card: "1.25rem",
        control: "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(42 31 23 / 0.05), 0 1px 3px 0 rgb(42 31 23 / 0.06)",
        card: "0 1px 2px 0 rgb(42 31 23 / 0.04), 0 12px 32px -8px rgb(42 31 23 / 0.14)",
        lift: "0 2px 4px 0 rgb(42 31 23 / 0.05), 0 20px 40px -12px rgb(42 31 23 / 0.22)",
        glow: "0 0 0 1px rgb(168 71 31 / 0.08), 0 8px 24px -6px rgb(168 71 31 / 0.25)",
      },
      backgroundImage: {
        "kettle-hero": "radial-gradient(120% 120% at 50% -10%, #FBEAE0 0%, #FAF5EC 55%)",
        "kettle-glow": "radial-gradient(60% 60% at 50% 0%, rgb(196 89 47 / 0.16) 0%, rgb(196 89 47 / 0) 70%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
