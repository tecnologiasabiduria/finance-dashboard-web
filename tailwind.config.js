/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial brandbook Sabiduría Empresarial 2026
        gold: {
          50: '#fdf3e7',   // parchment claro
          100: '#f8dfc5',
          200: '#f2cc88',  // golden cream (endpoint gradiente brandbook)
          300: '#eaad74',  // Sand Beige — color secundario oficial
          400: '#da7d41',  // Warm Amber — color primario oficial
          500: '#c06a35',
          600: '#a55a2d',
          700: '#7e301f',  // Deep Terracotta — color primario oficial
          800: '#5a2218',
          900: '#3d1610',
        },
        cream: {
          DEFAULT: '#f5ece0', // crema cálido — texto sobre fondos oscuros (brandbook)
          50:  '#fdfaf6',
          100: '#f9f2e8',
          200: '#f5ece0',
          300: '#eeddc8',
          400: '#e3c9a8',
        },
        dark: {
          50: '#f0f0f0',
          100: '#d4d4d8',
          200: '#a1a1aa',
          300: '#8a8a95',
          400: '#6e6e7a',
          500: '#4a4a55',
          600: '#33333d',
          700: '#282832',
          800: '#1e1e28',
          900: '#161620',  // Deep slate — fondo principal
          950: '#0f0f17',  // Deepest slate
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Florentia', 'Georgia', 'serif'],
      },
      backgroundImage: {
        // Gradiente brandbook: terracotta → amber → golden cream (cover slide)
        'gradient-gold': 'linear-gradient(135deg, #7e301f 0%, #da7d41 55%, #f2cc88 100%)',
        'gradient-gold-dark': 'linear-gradient(135deg, #7e301f 0%, #da7d41 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0f0f17 0%, #161620 100%)',
        // Variante radial para hero (brandbook cover)
        'gradient-gold-radial': 'radial-gradient(ellipse at 70% 30%, #f2cc88 0%, #da7d41 40%, #7e301f 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px -2px rgba(218, 125, 65, 0.15), 0 0 0 1px rgba(218, 125, 65, 0.08)',
        'gold-lg': '0 10px 40px -3px rgba(218, 125, 65, 0.2), 0 0 0 1px rgba(218, 125, 65, 0.1)',
        'gold-glow': '0 0 30px rgba(218, 125, 65, 0.12)',
        'dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'warm': '0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(218, 125, 65, 0.06)',
        'warm-lg': '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(218, 125, 65, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(218, 125, 65, 0.08)' },
          '50%': { boxShadow: '0 0 30px rgba(218, 125, 65, 0.15)' },
        },
      },
    },
  },
  plugins: [],
}
