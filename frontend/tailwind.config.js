/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0E0E0E',
        surface: '#181818',
        'surface-elevated': '#2B2B2B',
        'border-subtle': '#2B2B2B',
        'border-hover': '#555555',
        brand: {
          white: '#FFFFFF',
          light: '#D4D4D4',
          gray: '#B3B3B3',
          dark: '#2B2B2B',
        },
        'text-main': '#FFFFFF',
        'text-sub': '#D4D4D4',
        muted: '#B3B3B3',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
