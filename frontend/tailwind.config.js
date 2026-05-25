/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: 'oklch(21% 0.018 242)',
        mist: 'oklch(97% 0.012 210)',
        copper: 'oklch(61% 0.15 48)',
        spruce: 'oklch(43% 0.09 174)',
        rosewood: 'oklch(48% 0.13 24)'
      },
      boxShadow: {
        panel: '0 16px 40px oklch(25% 0.03 230 / 0.10)'
      }
    }
  },
  plugins: []
};

