import type { Config } from 'tailwindcss';

const hsl = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: hsl('background'),
        foreground: hsl('foreground'),
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        border: hsl('border'),
        primary: { DEFAULT: hsl('primary'), foreground: hsl('primary-foreground') },
        accent: hsl('accent'),
        warning: hsl('warning'),
      },
      borderRadius: { lg: 'var(--radius)' },
      fontFamily: { sans: ['var(--font-sans)'] },
    },
  },
} satisfies Config;
