/** @type {import('tailwindcss').Config} */
export default {
  content:  ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"DM Sans"',            'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia',   'serif'],
        mono:    ['"DM Mono"',            'monospace'],
      },
      colors: {
        // Agua Caribe — el acento que impacta
        brand: {
          50:   '#e4f8f3', // Bruma
          100:  '#c0f0e4', // Niebla Marina
          200:  '#c0f0e4',
          300:  '#55d8b4', // Jade
          400:  '#55d8b4', // Jade / hover dark
          500:  '#00b894', // Agua Caribe — principal
          600:  '#009a7a', // Caribe Oscuro — hover light
          700:  '#007a5a',
          800:  '#005a3a',
          900:  '#003a20',
        },
        // Selva Nocturna — base de identidad
        surface: {
          50:  '#f0f5f3', // Blanco Roto — background light
          100: '#d0e0da', // Niebla — bordes light
          200: '#d0e0da',
          400: '#5a9070', // Musgo — texto sec. dark
          600: '#2e5c3e', // Pino — bordes dark
          700: '#1e3d2a', // Bosque — hovers oscuros
          800: '#152a1e', // Selva Oscura — cards dark
          900: '#0b1712', // Selva Noche — sidebar, hero
          950: '#060e0a', // Footer
        },
        income:  '#00b894', // = Agua Caribe
        expense: '#e53e3e', // Mora
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
