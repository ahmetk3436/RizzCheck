/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        dark: {
          50: '#1e1e2e',
          100: '#181825',
          200: '#11111b',
          300: '#0a0a14',
        },
        accent: {
          purple: '#a855f7',
          blue: '#6366f1',
          cyan: '#22d3ee',
          amber: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
