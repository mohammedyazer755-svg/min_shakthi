/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        brand: {
          gold: 'var(--color-accent-gold)',
          'gold-text': 'var(--color-accent-gold-text)',
        },
        btn: {
          primary: 'var(--color-button-primary)',
        },
        status: {
          positive: 'var(--color-status-positive)',
          warning: 'var(--color-status-warning)',
          critical: 'var(--color-status-critical)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
      },
    },
  },
  plugins: [],
};
