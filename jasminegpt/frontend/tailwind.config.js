/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // JasmineGPT brand tokens — accessible via Tailwind classes
        jasmine: {
          pink: '#ec4899',
          'pink-dim': 'rgba(236, 72, 153, 0.14)',
        },
        emerald: {
          DEFAULT: '#10b981',
          hover:   '#059669',
        },
      },
      maxWidth: {
        chat: '860px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        pill: '9999px',
      },
      keyframes: {
        messageEntrance: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.65)', opacity: '0.4' },
          '40%':            { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        'message-fade-in': 'messageEntrance 0.24s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-dot-1': 'pulseDot 1.4s infinite ease-in-out both',
        'pulse-dot-2': 'pulseDot 1.4s 0.2s infinite ease-in-out both',
        'pulse-dot-3': 'pulseDot 1.4s 0.4s infinite ease-in-out both',
      },
    },
  },
  plugins: [],
}
