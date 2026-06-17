import type { Config } from 'tailwindcss'

// ─────────────────────────────────────────────────────────────────────────────
// Compass Design System — extracted from Figma file 82LmDt5zsgYIoDQga4mK4R
// ─────────────────────────────────────────────────────────────────────────────

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── Colour palette ──────────────────────────────────────────────────────
      colors: {
        // Brand — teal/ocean
        brand: {
          50:  '#e8f4f6',
          100: '#c5e4ea',
          200: '#9dcfda',
          300: '#5aabb9',
          400: '#2e8a9a',
          500: '#1e6d7c',
          600: '#1b5f6d',
          700: '#1b4f5c',   // ← Primary action colour
          800: '#153e49',
          900: '#0e2d36',
          950: '#071e24',
        },
        // Neutral — slate-based
        neutral: {
          0:   '#ffffff',   // White
          50:  '#f8f9fa',   // Page BG
          100: '#f1f3f5',   // Card BG 2
          200: '#e2e8f0',   // Border
          300: '#cbd5e1',   // Border Strong
          400: '#94a3b8',   // Text Muted
          500: '#64748b',   // Text Secondary
          600: '#475569',   // Icon Default
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',   // Text Primary
        },
        // Semantic
        success: {
          subtle: '#dcfce7',
          DEFAULT: '#16a34a',
        },
        error: {
          subtle: '#fef2f2',
          DEFAULT: '#dc2626',
        },
        warning: {
          subtle: '#fffbeb',
          DEFAULT: '#d97706',
        },
        info: {
          subtle: '#eff6ff',
          DEFAULT: '#2563eb',
        },
        ai: {
          DEFAULT: '#7c3aed',
        },
      },

      // ── Typography — Inter ──────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Body scale
        'body-xs':  ['12px', { lineHeight: '16.8px', letterSpacing: '0' }],
        'body-sm':  ['13px', { lineHeight: '18.2px', letterSpacing: '0' }],
        'body-md':  ['14px', { lineHeight: '21px',   letterSpacing: '0' }],
        'body-lg':  ['16px', { lineHeight: '24px',   letterSpacing: '0' }],
        'body-xl':  ['18px', { lineHeight: '28.8px', letterSpacing: '0' }],
        // Label scale
        'label-xs': ['11px', { lineHeight: '13.2px', letterSpacing: '0.4px' }],
        'label-sm': ['12px', { lineHeight: '14.4px', letterSpacing: '0.4px' }],
        'label-md': ['13px', { lineHeight: '15.6px', letterSpacing: '0.2px' }],
        'label-lg': ['14px', { lineHeight: '16.8px', letterSpacing: '0.2px' }],
        // Caption
        'caption-sm': ['11px', { lineHeight: '15.4px', letterSpacing: '0.2px' }],
        'caption-md': ['12px', { lineHeight: '16.8px', letterSpacing: '0.2px' }],
        // Overline
        'overline-sm': ['10px', { lineHeight: '12px',   letterSpacing: '1.6px' }],
        'overline-md': ['11px', { lineHeight: '13.2px', letterSpacing: '1.6px' }],
        // Headings
        'h6': ['14px', { lineHeight: '18.2px', letterSpacing: '0' }],
        'h5': ['16px', { lineHeight: '20.8px', letterSpacing: '0' }],
        'h4': ['24px', { lineHeight: '31.2px', letterSpacing: '0' }],
        'h3': ['22px', { lineHeight: '28.6px', letterSpacing: '0' }],
        'h2': ['28px', { lineHeight: '33.6px', letterSpacing: '-0.4px' }],
        'h1': ['32px', { lineHeight: '38.4px', letterSpacing: '-0.4px' }],
        // Display
        'display-sm':  ['28px', { lineHeight: '33.6px', letterSpacing: '-0.4px' }],
        'display-md':  ['32px', { lineHeight: '35.2px', letterSpacing: '-0.4px' }],
        'display-lg':  ['36px', { lineHeight: '39.6px', letterSpacing: '-0.4px' }],
        'display-xl':  ['40px', { lineHeight: '44px',   letterSpacing: '-0.8px' }],
        'display-2xl': ['48px', { lineHeight: '52.8px', letterSpacing: '-0.8px' }],
        // Numeric
        'numeric-sm': ['18px', { lineHeight: '18px', letterSpacing: '0' }],
        'numeric-md': ['22px', { lineHeight: '22px', letterSpacing: '-0.4px' }],
        'numeric-lg': ['28px', { lineHeight: '28px', letterSpacing: '-0.4px' }],
      },
      fontWeight: {
        normal:  '400',
        medium:  '500',
        semibold: '600',
        bold:    '700',
      },

      // ── Border radius — Compass tokens ──────────────────────────────────────
      borderRadius: {
        none:  '0',
        sm:    '4px',
        DEFAULT: '8px',    // buttons, inputs
        md:    '8px',
        lg:    '12px',     // cards, alerts, modals
        xl:    '16px',
        '2xl': '20px',
        full:  '9999px',   // badges, pills
      },

      // ── Box shadows — Compass Elevation tokens ───────────────────────────────
      boxShadow: {
        'elevation-0': '0 0 1px rgba(15,23,42,0.04)',
        'elevation-1': '0 1px 3px rgba(15,23,42,0.08)',
        'elevation-2': '0 4px 12px -1px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06)',
        'elevation-3': '0 8px 24px -2px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
        'elevation-4': '0 16px 40px -4px rgba(15,23,42,0.14), 0 4px 12px -1px rgba(15,23,42,0.06)',
        'elevation-5': '0 24px 60px -8px rgba(15,23,42,0.16)',
        'focus-brand': '0 0 0 3px #9dcfda',
        'focus-error': '0 0 0 3px #fecaca',
        // Keep some Tailwind defaults
        sm:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md:   '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg:   '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        none: 'none',
      },

      // ── Spacing — 8pt grid ──────────────────────────────────────────────────
      spacing: {
        px:   '1px',
        0:    '0',
        0.5:  '2px',
        1:    '4px',
        1.5:  '6px',
        2:    '8px',
        2.5:  '10px',
        3:    '12px',
        3.5:  '14px',
        4:    '16px',
        5:    '20px',
        6:    '24px',
        7:    '28px',
        8:    '32px',
        9:    '36px',
        10:   '40px',
        11:   '44px',
        12:   '48px',
        14:   '56px',
        16:   '64px',
        20:   '80px',
        24:   '96px',
        28:   '112px',
        32:   '128px',
      },
    },
  },
  plugins: [],
} satisfies Config
