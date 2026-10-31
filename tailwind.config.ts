import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#FBF7EE',
          100: '#F3E8CC',
          200: '#E5CE98',
          300: '#D4AD64',
          400: '#C9A84C',
          500: '#B8923A',
          600: '#9A7530',
          700: '#7A5A22',
          800: '#5A3F14',
          900: '#3A250A',
          950: '#1C0F05',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config
