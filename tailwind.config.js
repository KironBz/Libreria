/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4c51bf',
          800: '#3f46e6',
          900: '#2d3142',
        },
        secondary: {
          500: '#764ba2',
          600: '#6a3b8a',
          700: '#5e3273',
        }
      }
    },
  },
  plugins: [],
}
