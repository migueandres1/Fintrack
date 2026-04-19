/** @type {import('tailwindcss').Config} */
export default {
  content:  ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"DM Sans"',            'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia',   'serif'],
        mono:    ['"JetBrains Mono"',     '"DM Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Agua Caribe
        brand: {
          50:   '#e4f8f3',
          100:  '#c0f0e4',
          200:  '#c0f0e4',
          300:  '#55d8b4',
          400:  '#55d8b4',
          500:  '#00b894',
          600:  '#009a7a',
          700:  '#007a5a',
          800:  '#005a3a',
          900:  '#003a20',
        },
        // Selva Nocturna
        surface: {
          50:  '#f0f5f3',
          100: '#d0e0da',
          200: '#d0e0da',
          400: '#6a8880',
          500: '#5a9070',
          600: '#2e5c3e',
          700: '#1e3d2a',
          800: '#152a1e',
          900: '#0b1712',
          950: '#060e0a',
        },
        income:  '#00b894',
        expense: '#e53e3e',
        warn:    '#f0a500',
      },
      borderRadius: { xl: '1rem', '2xl': '1.5rem', '3xl': '2rem' },
      boxShadow: {
        card:        '0 1px 3px 0 rgb(0 0 0 / .08), 0 1px 2px -1px rgb(0 0 0 / .04)',
        'card-hover':'0 4px 20px 0 rgb(0 0 0 / .12)',
        hero:        '0 20px 40px -20px rgba(11,23,18,.18), 0 4px 10px rgba(11,23,18,.04)',
      },
    },
  },
  plugins: [],
};
