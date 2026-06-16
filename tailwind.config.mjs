/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FBF7F2",
          100: "#F6EFE7",
          200: "#EAD9C7",
        },
        blush: {
          100: "#FBE4DC",
          300: "#E8AFA0",
          500: "#D88A78",
        },
        terracotta: {
          400: "#C97B5E",
          500: "#B16347",
          600: "#8E4D34",
        },
        cocoa: {
          700: "#5B3A29",
          800: "#3F2618",
          900: "#26170E",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -8px rgba(94, 58, 41, 0.18)",
      },
    },
  },
  plugins: [],
};
