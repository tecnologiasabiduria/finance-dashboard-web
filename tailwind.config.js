/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf3e7',
          100: '#f8dfc5',
          200: '#f0c99e',
          300: '#eaad74',
          400: '#da7d41',
          500: '#c06a35',
          600: '#a55a2d',
          700: '#7e301f',
          800: '#5a2218',
          900: '#3d1610',
        },
        dark: {
          50: '#f5f0ed',
          100: '#ddd4cf',
          200: '#b8a99f',
          300: '#8c7a6f',
          400: '#6b5a50',
          500: '#4d3f38',
          600: '#3d322c',
          700: '#332a25',
          800: '#2e2326',
          900: '#261c21',
          950: '#1c1419',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Florentia', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #7e301f 0%, #da7d41 50%, #eaad74 100%)',
        'gradient-gold-dark': 'linear-gradient(135deg, #7e301f 0%, #da7d41 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1c1419 0%, #261c21 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px -2px rgba(218, 125, 65, 0.2)',
        'gold-lg': '0 10px 40px -3px rgba(218, 125, 65, 0.25)',
        'dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
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
      },
    },
  },
  plugins: [],
}
