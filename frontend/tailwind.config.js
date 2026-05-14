/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bone: {
          50: '#FBF8F2',
          100: '#F6F1E7',
          200: '#EDE5D4',
          300: '#DCD0B8',
        },
        forest: {
          100: '#DCE7E0',
          300: '#A9C2B5',
          500: '#5A8A77',
          600: '#2E6B55',
          700: '#1F5240',
          800: '#143A2C',
          900: '#0E2A21',
        },
        clay: {
          100: '#F7E6D9',
          200: '#EFD3C2',
          500: '#C97B5B',
          700: '#B5613D',
        },
        ink: {
          DEFAULT: '#1A1F1B',
          soft: '#4A524C',
          mute: '#7B847E',
          faint: '#B0B6AF',
        },
        line: {
          DEFAULT: '#D9CFC2',
          soft: '#E7DECC',
        },
        positive: { 100: '#DCEBDF', 500: '#3F8C5C', 700: '#2C6B45' },
        caution: { 100: '#F3E3C0', 500: '#C28A2C', 700: '#8A5A14' },
        critical: { 100: '#F2D9D9', 500: '#B14242', 700: '#8A2A2A' },
        info: { 100: '#DDE6F1', 500: '#4E78A8', 700: '#2A4F7A' },
      },

      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },

      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.55' }],
        md: ['17px', { lineHeight: '1.7' }],
        lg: ['20px', { lineHeight: '1.3' }],
        xl: ['24px', { lineHeight: '1.3' }],
        '2xl': ['32px', { lineHeight: '1.15', letterSpacing: '-0.005em' }],
        '3xl': ['44px', { lineHeight: '1.04', letterSpacing: '-0.015em' }],
        '4xl': ['60px', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        '5xl': ['84px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },

      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '24px',
        6: '32px',
        7: '48px',
        8: '64px',
        9: '96px',
      },

      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '8px',
        pill: '999px',
      },

      boxShadow: {
        1: '0 1px 0 rgba(20, 58, 44, 0.04)',
        2: '0 8px 24px -12px rgba(20, 58, 44, 0.18), 0 2px 6px -2px rgba(20, 58, 44, 0.06)',
        3: '0 24px 56px -20px rgba(20, 58, 44, 0.22), 0 4px 12px -4px rgba(20, 58, 44, 0.08)',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        in: 'cubic-bezier(0.6, 0, 0.8, 0.2)',
      },
      transitionDuration: {
        fast: '140ms',
        base: '220ms',
        slow: '360ms',
      },

      letterSpacing: {
        tight: '-0.02em',
        wide: '0.06em',
        wider: '0.14em',
      },

      maxWidth: {
        container: '1240px',
        prose: '56ch',
      },

      height: {
        btn: '40px',
        btnSm: '32px',
        btnLg: '48px',
        input: '40px',
        header: '76px',
      },
    },
  },
  plugins: [],
}
