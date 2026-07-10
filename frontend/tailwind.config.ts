import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Arrendia aprobada
        brand: {
          bg:      '#FDFBF7',
          card:    '#FFFFFF',
          text:    '#1A1A1A',
          primary: '#2C3E50',
          accent:  '#C5A880',
          success: '#2E7D32',
          error:   '#C62828',
        },
        // Alias semánticos para uso rápido — Azul marino ejecutivo
        primary: {
          DEFAULT: '#0F2A4A',
          50:  '#EAF0F8',
          100: '#C7D6EA',
          200: '#9FB8D9',
          300: '#6F93C0',
          400: '#3E699F',
          500: '#0F2A4A',
          600: '#0C2240',
          700: '#091A32',
          800: '#061224',
          900: '#030A15',
        },
        accent: {
          DEFAULT: '#C5A880',
          light:   '#F0E6D6',
          dark:    '#8C7055',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Optimizado para mobile
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'base':['14px', { lineHeight: '20px' }],
        'md':  ['15px', { lineHeight: '22px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '20px',
        'full':'9999px',
      },
      spacing: {
        // Bottom nav height
        'nav': '64px',
      },
      screens: {
        // Mobile first
        'sm':  '390px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
      },
    },
  },
  plugins: [],
}

export default config
