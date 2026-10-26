/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2d5a27", // Fig Leaf Green
        "primary-hover": "#1d3c1a",
        secondary: "#d6cadd", // Soft Lilac
        tertiary: "#1a1a1a", // Deep Charcoal
        background: "#f9faf2", // Sun-bleached Warm Off-white
        "surface-lowest": "#ffffff",
        "surface-low": "#f3f4ed",
        "surface-container": "#edefe7",
        "surface-high": "#e7e9e1",
        "outline-variant": "#c2c9bb",
        "on-surface-variant": "#42493e",
        "on-surface": "#191c18",
        "primary-container": "#2d5a27",
        "on-primary": "#ffffff",
        "secondary-container": "#ebdef2",
        "on-secondary-container": "#6a6171",
      },
      borderRadius: {
        DEFAULT: "0.25rem", // ROUND_FOUR
        "lg": "0.25rem",
        "xl": "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1.25rem",
        "full": "9999px",
      },
      fontFamily: {
        epilogue: ["Epilogue", "sans-serif"],
        hanken: ["Hanken Grotesk", "sans-serif"],
      },
      spacing: {
        xs: "0.5rem",
        sm: "1rem",
        md: "1.5rem",
        lg: "3rem",
        xl: "5rem",
      },
      boxShadow: {
        "glass": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
}
