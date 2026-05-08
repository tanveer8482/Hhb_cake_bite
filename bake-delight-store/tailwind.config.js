/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        script: ['Great Vibes', 'cursive'],
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        gold: {
          50: '#fffbea',
          100: '#fff1c5',
          200: '#ffe38e',
          300: '#ffcc4b',
          400: '#ffb21a',
          500: '#f99207',
          600: '#e27303',
          700: '#bc5105',
          800: '#993f0a',
          900: '#7e340b',
          DEFAULT: '#D4AF37',
        },
        cream: {
          50: '#fffdf0',
          100: '#fffbd6',
          200: '#fff7ad',
          DEFAULT: '#FFFDD0',
        },
        brown: {
          900: '#3E2723',
          800: '#4E342E',
          700: '#5D4037',
        }
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'marquee2': 'marquee2 25s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marquee2: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        glow: {
          'from': { textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #D4AF37, 0 0 20px #D4AF37' },
          'to': { textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #D4AF37, 0 0 40px #D4AF37' },
        }
      }
    },
  },
  plugins: [],
}
