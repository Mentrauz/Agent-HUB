import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'VT323'", "var(--font-vt323)", "monospace"],
        vt323: ["'VT323'", "var(--font-vt323)", "monospace"],
        mono: ["var(--font-mono)", "Geist Mono", "monospace"],
        serif: ["var(--font-serif)", "Lora", "Georgia", "serif"],
        sans: ["var(--font-geist)", "Geist", "sans-serif"],
        geist: ["var(--font-geist)", "Geist", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // ── Agent Infrastructure Design Tokens ──
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
          elevated: "var(--surface-elevated)",
        },
        brand: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          contrast: "var(--accent-contrast)",
        },
        state: {
          success: "var(--state-success)",
          warning: "var(--state-warning)",
          error: "var(--state-error)",
        },
        node: {
          agent: "var(--node-agent)",
          tool: "var(--node-tool)",
          control: "var(--node-control)",
          hitl: "var(--node-hitl)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",       // 24px
        md: "var(--radius-md)",       // 16px
        sm: "var(--radius-sm)",       // 10px
        pill: "var(--radius-pill)",   // 999px
        // Legacy shorthands kept for compatibility
        "2xl": "var(--radius-lg)",
        xl: "var(--radius-md)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "0 1px 3px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.24)",
        elevated: "0 12px 32px rgba(0,0,0,0.32)",
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 8px 24px rgba(34,211,238,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out both",
        "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-left": "slideInLeft 0.5s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 5s ease-in-out infinite",
        "pulse-gentle": "pulse-gentle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
