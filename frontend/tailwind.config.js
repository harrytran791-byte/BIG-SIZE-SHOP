/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', 'Inter', 'Georgia', 'serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontWeight: {
        extrabold: '700',
        black: '700',
      },
      colors: {
        brand: {
          50: '#FAF0F2',
          100: '#F5DDE1',
          200: '#E8B8C0',
          300: '#C97482',
          400: '#8E2838',
          500: '#70222B',
          600: '#6B1D2F',
          700: '#5C1D24', // Deep Burgundy / Wine Red from mockup
          800: '#4A121D',
          900: '#330C14',
        },
        surface: {
          light: '#FAF8F5',
          cream: '#F4EFEA', // Exact warm beige from hero mockup
          card: '#FFFFFF',
          border: '#EBE5DF',
          sand: '#EFE8E0',
        },
        charcoal: {
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
          500: '#78716C',
          400: '#A8A29E',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(28, 25, 23, 0.04)',
        'float': '0 10px 30px -4px rgba(28, 25, 23, 0.08)',
        'modal': '0 25px 50px -12px rgba(28, 25, 23, 0.25)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideDown: 'slideDown 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}
