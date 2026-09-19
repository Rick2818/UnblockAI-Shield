/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        cyber: {
          black: '#05070E',
          dark: '#0A0F1D',
          card: '#0D1527',
          border: '#1E293B',
          cyan: '#00F2FE',
          blue: '#4FACFE',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E'
        }
      }
    }
  },
  plugins: [],
};
