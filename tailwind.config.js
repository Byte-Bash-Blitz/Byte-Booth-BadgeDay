/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        hogwarts: {
          50: '#FFF5F5',
          100: '#FFE0E0',
          200: '#FFC0C0',
          300: '#FF8080',
          400: '#E83A3A',
          500: '#C41E3A',
          600: '#9B152E',
          700: '#740001',
          800: '#520001',
          900: '#350001',
          950: '#1A0001',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D4AF37',
          600: '#B8922A',
          700: '#92731E',
          800: '#735A16',
          900: '#54430F',
        },
        parchment: {
          50: '#FDFAF3',
          100: '#F9F1E0',
          200: '#EFD9B0',
          300: '#E2C07E',
          400: '#D4A04C',
          500: '#C4882A',
          600: '#A66E1E',
          700: '#875515',
          800: '#6A400F',
          900: '#4E2E09',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'display': ['Cinzel', 'Georgia', 'serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-celebration': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      }
    },
  },
  plugins: [],
}
