/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        forest:        '#0D1A10',
        'forest-mid':  '#1B3A2D',
        'forest-soft': '#2D5C3F',
        sage:          '#8DB49A',
        'sage-dim':    '#5A8A6E',
        ivory:         '#F2EDDF',
        parchment:     '#E8E0CC',
        linen:         '#D5CAB5',
        ochre:         '#C4922A',
        'ochre-light': '#D9A83F',
        sienna:        '#B05527',
        obsidian:      '#0E0C09',
        'ink':         '#1E1C17',
        muted:         '#7A7568',
        'muted-light': '#B0A898',
      },
      fontFamily: {
        display:   ['"Abril Fatface"', 'Impact', 'serif'],
        serif:     ['"Cormorant Garamond"', 'Georgia', 'serif'],
        condensed: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        body:      ['"Barlow"', 'Helvetica', 'sans-serif'],
      },
      animation: {
        'marquee':   'marquee 38s linear infinite',
        'float':     'float 7s ease-in-out infinite',
        'float-alt': 'float 9s ease-in-out infinite reverse',
        'spin-slow': 'spin 55s linear infinite',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'scan':      'scan 4s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%':      { transform: 'scale(1.5)', opacity: '1' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(-4px)' },
          '50%':      { transform: 'translateY(4px)' },
        },
      },
    },
  },
  plugins: [],
};
