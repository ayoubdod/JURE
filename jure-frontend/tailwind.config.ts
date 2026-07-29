import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		fontFamily: {
			sans: ['Geist Sans', 'Inter', 'system-ui', 'sans-serif'],
		},
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Jure Purple Color Palette
				jure: {
					50: '#F4F1FF',   // Lightest
					100: '#E8E0FF',
					200: '#CFC2FF',   // Lighter
					300: '#B8A5FF',
					400: '#A08FE8',
					500: '#8B6FD1',   // Light
					600: '#64499D',   // Primary
					700: '#4D3680',   // Dark
					800: '#3E2D71',   // Darker
					900: '#2A1F4A',   // Darkest
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'logo-breathe': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.85', transform: 'scale(1.02)' }
				},
				'logo-dot': {
					'0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
					'40%': { opacity: '1', transform: 'scale(1)' }
				},
				'notification-badge-pulse': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.4)' }
				},
				'notification-bell-shake': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'16.66%': { transform: 'rotate(15deg)' },
					'33.33%': { transform: 'rotate(-15deg)' },
					'50%': { transform: 'rotate(15deg)' },
					'66.66%': { transform: 'rotate(-15deg)' },
					'83.33%': { transform: 'rotate(15deg)' }
				},
				'notification-dropdown-in': {
					from: { opacity: '0', transform: 'translateY(-8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'notification-dropdown-out': {
					from: { opacity: '1', transform: 'translateY(0)' },
					to: { opacity: '0', transform: 'translateY(-8px)' }
				},
				'notification-row-in': {
					from: { opacity: '0', transform: 'translateY(-8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'notification-toast-in': {
					from: { opacity: '0', transform: 'translateX(100%)' },
					to: { opacity: '1', transform: 'translateX(0)' }
				},
				'notification-toast-out': {
					from: { opacity: '1', transform: 'translateX(0)' },
					to: { opacity: '0', transform: 'translateX(120%)' }
				},
				'juria-fab-breathe': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.05)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'logo-breathe': 'logo-breathe 2s ease-in-out infinite',
				'logo-dot': 'logo-dot 1.2s ease-in-out infinite',
				'notification-badge-pulse': 'notification-badge-pulse 400ms ease-out',
				'notification-bell-shake': 'notification-bell-shake 500ms ease-in-out',
				'notification-dropdown-in': 'notification-dropdown-in 200ms ease-out forwards',
				'notification-dropdown-out': 'notification-dropdown-out 150ms ease-in forwards',
				'notification-row-in': 'notification-row-in 220ms ease-out forwards',
				'notification-toast-in': 'notification-toast-in 300ms ease-out forwards',
				'notification-toast-out': 'notification-toast-out 280ms ease-in forwards',
				'juria-fab-breathe': 'juria-fab-breathe 2.8s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
