/** @type {import('tailwindcss').Config} */
export default {
  content:  ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"DM Sans"',    'system-ui', 'sans-serif'],
        display: ['"Syne"',       'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"',    'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#080f1a',
          600: '#475569',
        },
        income:  '#22c55e',
        expense: '#f43f5e',
      },
      borderRadius: { xl: '1rem', '2xl': '1.5rem', '3xl': '2rem' },
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / .08), 0 1px 2px -1px rgb(0 0 0 / .04)',
        'card-hover': '0 4px 20px 0 rgb(0 0 0 / .12)',
      },
    },
  },
  plugins: [],
};
