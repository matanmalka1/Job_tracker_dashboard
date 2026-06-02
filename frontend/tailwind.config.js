/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:         'var(--bg-base)',
        surface:      'var(--bg-surface)',
        raised:       'var(--bg-raised)',
        hover:        'var(--bg-hover)',
        accent:       'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        t1:           'var(--text-1)',
        t2:           'var(--text-2)',
        t3:           'var(--text-3)',
        'panel-bg':   'var(--bg-surface)',
        'input-bg':   'var(--bg-raised)',
      },
      fontFamily: {
        mono: ['var(--font-mono)'],
        sans: ['var(--font-sans)'],
      },
      borderColor: {
        DEFAULT:      'var(--border)',
        mid:          'var(--border-mid)',
        hi:           'var(--border-hi)',
        theme:        'var(--border)',
        'theme-hi':   'var(--border-hi)',
      },
      animation: {
        shimmer:    'shimmer 2.4s ease infinite',
        'fade-up':  'fade-up 0.3s ease-out both',
        'fade-in':  'fade-in 0.2s ease-out both',
        'count-in': 'count-in 0.4s ease-out both',
        'tl-in':    'tlIn 0.28s ease-out both',
      },
    },
  },
  plugins: [],
}
