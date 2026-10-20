/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        uiu: {
          orange: "#F26522",
          orangeHover: "#D95414",
          dark: "#0F172A",
          darker: "#020617",
          card: "#1E293B",
          border: "#334155",
          accent: "#38BDF8",
        }
      }
    },
  },
  plugins: [],
};
