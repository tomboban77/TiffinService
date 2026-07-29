import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Warm, food-adjacent palette: a cream/stone page background instead of
// stark gray, near-black warm ink for text, and one confident accent
// (deep saffron/amber) instead of the generic blue most SaaS dashboards
// default to. Semantic green/red stay close to Tailwind's own tuned
// (already AA-checked) emerald/red scales rather than custom hex, since
// getting a hand-rolled accessible color scale wrong is an easy way to
// silently fail the AA bar this pass is supposed to meet.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: colors.stone[50],
        surface: "#FFFFFF",
        ink: {
          DEFAULT: colors.stone[900],
          muted: colors.stone[600],
          subtle: colors.stone[400],
        },
        line: colors.stone[200],
        accent: {
          50: colors.amber[50],
          100: colors.amber[100],
          200: colors.amber[200],
          400: colors.amber[400],
          500: colors.amber[500],
          600: colors.amber[600],
          700: colors.amber[700],
          DEFAULT: colors.amber[600],
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
      fontSize: {
        // Today's cook-count numerals — legible at arm's length in a kitchen.
        stat: ["2.75rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        card: "1rem",
        control: "0.625rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(28 23 18 / 0.04), 0 1px 3px 0 rgb(28 23 18 / 0.06)",
        card: "0 1px 2px 0 rgb(28 23 18 / 0.04), 0 8px 24px -4px rgb(28 23 18 / 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
