/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mystery: {
          50: '#e6e1f0',
          100: '#c3afeb',
          200: '#9b7dcd',
          300: '#7855aa',
          400: '#5a3787',
          500: '#412346',
          600: '#2d162f',
          700: '#1e0f23',
          800: '#140a1c',
          900: '#0a0514',
        },
        gold: {
          300: '#f0c864',
          400: '#e6b43c',
          500: '#daa520',
        },
        blood: {
          500: '#8b0000',
          600: '#640000',
        },
        cream: {
          100: '#faf5eb',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        gold: '0 10px 30px -10px rgba(218, 165, 32, 0.4)',
        blood: '0 10px 30px -10px rgba(139, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
