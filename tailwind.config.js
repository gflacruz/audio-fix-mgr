/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom branding colors if needed
        'amp-orange': '#f59e0b', // amber-500
      }
    },
  },
  plugins: [],
}
