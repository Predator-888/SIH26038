/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-end medical slate palette
        clinical: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#080C14",
        },
        // Dedicated PACS Darkroom Palette
        pacs: {
          base: "#0A0D12",
          panel: "#121720",
          surface: "#18202C",
          border: "#243042",
          accent: "#00E5FF",
        },
        // Deep Teal / Cerulean Medical Primary
        medical: {
          DEFAULT: "#0F766E",
          hover: "#115E59",
          light: "#F0FDFA",
          dark: "#134E4A",
          glow: "#14B8A6",
        },
        // Clinical Alert Colors
        status: {
          normal: "#10B981",
          normalBg: "#ECFDF5",
          normalBorder: "#A7F3D0",
          
          warning: "#F59E0B",
          warningBg: "#FFFBEB",
          warningBorder: "#FDE68A",
          
          referable: "#E11D48",
          referableBg: "#FFF1F2",
          referableBorder: "#FECDD3",
          
          critical: "#BE123C",
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', '"IBM Plex Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'panel': '0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
        'pacs': '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 20px 2px rgba(20, 184, 166, 0.1)',
        'glow-teal': '0 0 20px -3px rgba(20, 184, 166, 0.4)',
        'glow-rose': '0 0 20px -3px rgba(225, 29, 72, 0.4)',
      }
    },
  },
  plugins: [],
}
