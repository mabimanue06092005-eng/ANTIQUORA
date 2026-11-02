import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui semantic tokens (CSS variables in index.css), mapped onto the ANTIQUORA palette.
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        ring: 'hsl(var(--ring))',
        ivory: '#FAF6EE',
        parchment: { DEFAULT: '#F1E9D9', deep: '#E6DAC2' },
        forest: { DEFAULT: '#1F3B2D', light: '#2D5240', dark: '#14271E' },
        gold: { DEFAULT: '#B08D57', light: '#D2B783', dark: '#80632F' },
        walnut: { DEFAULT: '#3B2A20', light: '#5C4536', dark: '#241912' },
        burgundy: { DEFAULT: '#6B1F2A', light: '#8C3240', dark: '#3E1018' },
        emerald: { DEFAULT: '#0F3D2E', light: '#1A5A44', dark: '#082419' },
        ink: { DEFAULT: '#221F1A', soft: '#4A443B', muted: '#6E665A' },
        line: '#DDD0B8',
        danger: '#9B2C2C',
        success: '#2F6B45',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        caps: '0.18em',
      },
      boxShadow: {
        card: '0 1px 2px rgba(59,42,32,0.06), 0 8px 24px -12px rgba(59,42,32,0.18)',
        lift: '0 2px 4px rgba(59,42,32,0.08), 0 22px 40px -18px rgba(59,42,32,0.35)',
        frame: 'inset 0 0 0 1px rgba(176,141,87,0.55), 0 30px 60px -30px rgba(0,0,0,0.6)',
      },
      maxWidth: {
        site: '1320px',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        scan: { '0%': { top: '0.75rem', opacity: '0' }, '10%': { opacity: '1' }, '90%': { opacity: '1' }, '100%': { top: 'calc(100% - 0.75rem)', opacity: '0' } },
        beam: { to: { transform: 'rotate(360deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        scan: 'scan 2.4s cubic-bezier(0.65,0,0.35,1) 0.4s 1 both',
        beam: 'beam 6s linear infinite',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};
