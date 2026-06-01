/** @type {import('tailwindcss').Config} */
// tailwind.config.js
// ====================
// Tells Tailwind which files to scan for class names.
// Tailwind only includes CSS for classes that are actually used.

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",   // Scan all JS and JSX files in src/
  ],
  theme: {
    extend: {
      // Custom font families — loaded via Google Fonts in index.html
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],   // Headers / titles
        body:    ['"DM Sans"', 'sans-serif'], // Body text
        mono:    ['"DM Mono"', 'monospace'],  // Passport numbers / data
      },
      // Custom color palette — our brand colors
      colors: {
        ink: {
          50:  '#f0f0f4',
          100: '#e0e0e8',
          200: '#c2c2d0',
          300: '#9393a8',
          400: '#6b6b80',
          500: '#4a4a5a',
          600: '#363645',
          700: '#252532',
          800: '#16161f',
          900: '#0d0d14',
          950: '#08080e',
        },
        accent: {
          DEFAULT: '#7fffb2',  // Bright mint green — main action color
          dim:     '#4dd97a',
          dark:    '#1a7a42',
        },
        gold: '#f5c842',       // Used for confidence score badges
      },
      // Custom animations
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse_ring: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        }
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'shimmer':    'shimmer 2s infinite linear',
        'pulse-ring': 'pulse_ring 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}