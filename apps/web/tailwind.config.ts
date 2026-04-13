/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff4ff',
          100: '#dbe6fe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#5E6AD2',
          600: '#4f5bb3',
          700: '#414a94',
          800: '#333a75',
          900: '#262b56',
        },
      },
    },
  },
  plugins: [],
}
