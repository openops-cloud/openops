const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': [
        '1.625rem',
        {
          lineHeight: '2.438rem',
          fontWeight: '700',
        },
      ],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
    transitionTimingFunction: {
      'expand-out': 'cubic-bezier(0.35, 0, 0.25, 1)',
    },
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      transitionDuration: {
        1500: '1500ms',
      },
      colors: {
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          50: 'hsl(var(--warning-50))',
          100: 'hsl(var(--warning-100))',
          200: 'hsl(var(--warning-200))',
          300: 'hsl(var(--warning-300))',
          400: 'hsl(var(--warning-400))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          300: 'hsl(var(--border-300))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        editorBackground: 'hsl(var(--editor-background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          800: 'hsl(var(--primary-800))',
        },
        blue: {
          50: 'hsl(var(--blue-50))',
        },
        greenAccent: {
          DEFAULT: 'hsl(var(--green-accent))',
          100: 'hsl(var(--green-accent-100))',
          200: 'hsl(var(--green-accent-200))',
          300: 'hsl(var(--green-accent-300))',
        },
        blueAccent: {
          DEFAULT: 'hsl(var(--blue-accent))',
          100: 'hsl(var(--blue-accent-100))',
          200: 'hsl(var(--blue-accent-200))',
          300: 'hsl(var(--blue-accent-300))',
          400: 'hsl(var(--blue-accent-400))',
        },
        greyBlue: {
          DEFAULT: 'hsl(var(--grey-blue))',
          50: 'hsl(var(--grey-blue-50))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          100: 'hsl(var(--success-100))',
          300: 'hsl(var(--success-300))',
          400: 'hsl(var(--success-400))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          100: 'hsl(var(--destructive-100))',
          300: 'hsl(var(--destructive-300))',
          400: 'hsl(var(--destructive-400))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
        xs: 'calc(var(--radius) - 8px)',
        xss: 'calc(var(--radius) - 10px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      letterSpacing: {
        DEFAULT: '0.01em',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fade: {
          '0%': {
            opacity: 0,
          },
          '100%': {
            opacity: 1,
          },
        },
        slideDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        slideUp: {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
        slideUp: 'slideUp 0.2s ease-out',
        fade: 'fade 0.2s ease-out',
      },
      boxShadow: {
        editor: '3px 8px 23px 0px hsla(var(--editor-shadow-color))',
        template: '3px 3px 16px 0px hsla(var(--grey-blue) / 0.25)',
        'step-container': '0px 0px 22px hsl(var(--border))',
        'add-button': 'var(--add-button-shadow)',
        sidebar: '0px 0px 10px 0px rgba(var(--sidebar-shadow-color))',
      },
      contain: {
        layout: 'layout',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
    function ({ addBase }) {
      addBase({
        html: { letterSpacing: '0.01em' },
        body: { letterSpacing: '0.01em' },
      });
    },
  ],
};
