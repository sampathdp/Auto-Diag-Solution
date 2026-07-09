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

        // ---- Admin dashboard semantic tokens -------------------------------
        // All aliases onto the same five brand CSS variables above — no new
        // hues except success/warning/info, which the brand palette has no
        // equivalent for and any data-heavy admin UI needs. `danger` reuses
        // `--destructive`. Named `ink`/`ink-muted` (not `text-primary`) to
        // avoid colliding with the existing accent `primary` (amber, used for
        // CTAs/links everywhere) — see ADMIN_ARCHITECTURE.md §"Design system".
        sidebar: {
          DEFAULT: "hsl(var(--navy))",
          foreground: "hsl(var(--navy-foreground))",
        },
        app: "hsl(var(--secondary))", // page canvas behind cards
        surface: "hsl(var(--card))", // card/panel/input background
        subtle: "hsl(var(--border) / 0.06)", // lighter-than-default divider
        ink: {
          DEFAULT: "hsl(var(--foreground))",
          muted: "hsl(var(--muted-foreground))",
        },
        success: {
          DEFAULT: "hsl(152 69% 31%)",
          foreground: "hsl(0 0% 100%)",
        },
        warning: {
          DEFAULT: "hsl(38 92% 50%)",
          foreground: "hsl(26 24% 16%)",
        },
        danger: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: {
          DEFAULT: "hsl(199 89% 48%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)", // 10px — cards/panels/modals
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)", // 6px — buttons/inputs/controls
      },
      boxShadow: {
        soft: "0 2px 8px hsl(var(--foreground) / 0.06)",
        card: "0 12px 28px -12px hsl(var(--foreground) / 0.16)",
        lifted: "0 30px 60px -24px hsl(var(--foreground) / 0.22)",
        cta: "0 10px 24px -10px hsl(var(--primary) / 0.38)",
        // Tailwind's built-in `shadow-sm`/`shadow-md` are already directional
        // elevation shadows (distinct from the ambient `soft` family above) —
        // the admin UI uses those defaults directly rather than redefining them.
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        arabic: ["var(--font-arabic)"],
      },
      fontSize: {
        // Admin typography scale — h1-h4/body/caption/label. Pair with
        // font-bold/font-semibold utilities as needed (Tailwind fontSize
        // tuples don't carry weight). Spacing scale (4/8/12/16/24/32/48/64px)
        // is Tailwind's own default spacing (1,2,3,4,6,8,12,16) — already
        // exactly that, so nothing to add there.
        h1: ["1.875rem", { lineHeight: "2.25rem" }],
        h2: ["1.5rem", { lineHeight: "2rem" }],
        h3: ["1.25rem", { lineHeight: "1.75rem" }],
        h4: ["1.125rem", { lineHeight: "1.5rem" }],
        body: ["0.875rem", { lineHeight: "1.375rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
        label: ["0.8125rem", { lineHeight: "1.125rem" }],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
