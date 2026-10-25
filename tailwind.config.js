/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        apple: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
        swiss: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        editorial: ['Georgia', '"Newsreader"', '"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        warm: {
          50: '#FAF8F5',
          100: '#F5EFE6',
          200: '#E8DCCF',
          300: '#D5C2AF',
          600: '#8C6C50',
          800: '#4A3B2C',
          900: '#2A1F17',
        },
        sage: {
          50: '#F3F6F4',
          100: '#E3EBE6',
          500: '#5F826D',
          700: '#3D5948',
        },
        terracotta: {
          500: '#C86D51',
          600: '#B0563B',
        }
      }
    },
  },
  plugins: [],
}
