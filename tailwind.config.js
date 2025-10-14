/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        seemati: {
          pink: "#e91e63",
          maroon: "#800000",
          blue: "#3f51b5",
          yellow: "#ffeb3b",
        }
      }
    },
  },
  plugins: [],
}
