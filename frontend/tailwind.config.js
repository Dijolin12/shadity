/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#0d1117',
          panel: '#161b22',
          sidebar: '#0d1117',
          border: '#30363d',
          active: '#1f242c',
          hover: '#21262d',
          accent: '#2f81f7',
          agent: '#8957e5',
          text: '#c9d1d9',
          muted: '#8b949e',
          success: '#2ea043',
          error: '#f85149',
          warning: '#d29922',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

