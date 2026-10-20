/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        'accent-soft': 'var(--bg-accent-soft)',
        'app-border': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-on-orange': 'var(--text-on-orange)',
        orange: {
          50: '#FFF6EE',
          100: '#FFEBDB',
          400: '#FF8A4C',
          500: '#F26B21',
          600: '#D9560F',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
      },
      boxShadow: {
        warm: '0 1px 2px rgba(242,107,33,0.06), 0 4px 16px rgba(31,41,55,0.05)',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
        chip: '999px',
      },
    },
  },
  plugins: [],
};
