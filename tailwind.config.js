/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B', // zinc-950
        card: '#121215', // custom dark zinc for cards
      }
    },
  },
  plugins: [],
}
