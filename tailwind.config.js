/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'] },
      colors: {
        ink: { 950: '#080D18', 900: '#0B1220', 800: '#101A2D', 700: '#16223A', 600: '#1E2D4A', 500: '#2A3B5E' },
        line: '#233250',
        mute: '#8D9BB8',
        brand: { DEFAULT: '#1FA974', 600: '#198F63', 300: '#5FD0A2' },
        sky: { DEFAULT: '#2796CC' },
        amber: { DEFAULT: '#CC7F18' },
        violet: { DEFAULT: '#8461DB' },
        danger: '#E5614F',
      },
      boxShadow: { pop: '0 12px 40px -8px rgba(0,0,0,.55)' },
    },
  },
  plugins: [],
};
