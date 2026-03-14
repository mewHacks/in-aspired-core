/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ← enables Tailwind dark: variants via the 'dark' class on <html>
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "!**/node_modules/**"
  ],
  safelist: [
    // Safelist all color combinations used in DashboardPage
    // This ensures Tailwind generates these classes even with dynamic values
    'text-amber-600',
    'text-amber-700',
    'text-rose-600',
    'text-rose-700',
    'text-violet-600',
    'text-violet-700',
    'text-teal-600',
    'text-teal-700',
    'bg-amber-100',
    'bg-amber-400',
    'bg-rose-100',
    'bg-rose-400',
    'bg-violet-100',
    'bg-violet-400',
    'bg-teal-100',
    'bg-teal-400',
    'border-amber-200',
    'border-amber-300',
    'border-rose-200',
    'border-rose-300',
    'border-violet-200',
    'border-violet-300',
    'border-teal-200',
    'border-teal-300',
    'from-amber-500/10',
    'from-amber-500/15',
    'to-amber-400/5',
    'to-amber-400/10',
    'from-rose-500/10',
    'from-rose-500/15',
    'to-rose-400/5',
    'to-rose-400/10',
    'from-violet-500/10',
    'from-violet-500/15',
    'to-violet-400/5',
    'to-violet-400/10',
    'from-teal-500/10',
    'from-teal-500/15',
    'to-teal-400/5',
    'to-teal-400/10',
  ],
  theme: {
    extend: {
      colors: {
        // Gen Z Palette ("Aurora Neon")
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed', // Electric Violet
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          DEFAULT: '#7c3aed',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8', // Sky Blue (Legacy)
          500: '#0ea5e9', // Electric Blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          DEFAULT: '#0ea5e9',
        },
        accent: {
          pink: '#f472b6',   // Hot Pink
          yellow: '#facc15', // Cyber Yellow
          lime: '#a3e635',   // Acid Lime
        },
        surface: {
          light: '#ffffff',
          glass: 'rgba(255, 255, 255, 0.7)',
        },
        dark: {
          900: '#0f172a', // Deep Space Blue
          800: '#1e293b',
          700: '#334155',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'], // Replaces serif for headings
        serif: ['Outfit', 'sans-serif'],   // Fallback alias
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'blob': "blob 7s infinite",
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      }
    },
  },
  plugins: [],
}