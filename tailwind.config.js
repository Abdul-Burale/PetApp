/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: '#1f4d3b', accent: '#d97835', ink: '#202521', sand: '#f6f4ee', line: '#deddd6' }, boxShadow: { card: '0 5px 18px rgba(27, 37, 31, .08)' } } },
  plugins: []
}
