import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        wrap: "1440px",
      },
      colors: {
        border: "hsl(var(--border) / 0.10)",
        input: "hsl(var(--input) / 0.14)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          foreground: "hsl(var(--navy-foreground))",
          border: "hsl(var(--navy-foreground) / 0.13)",
          soft: "hsl(var(--navy-foreground) / 0.62)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground) / 0.62)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 2px 8px hsl(var(--foreground) / 0.06)",
        card: "0 12px 28px -12px hsl(var(--foreground) / 0.16)",
        lifted: "0 30px 60px -24px hsl(var(--foreground) / 0.22)",
        cta: "0 10px 24px -10px hsl(var(--primary) / 0.38)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        arabic: ["var(--font-arabic)"],
      },
    },
  },
  plugins: [animate],
};

export default config;
