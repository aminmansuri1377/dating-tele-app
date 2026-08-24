/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF4D6D', // primary accent — warm coral/rose, distinct from Tinder-red / PURE-purple
          dark: '#C9184A',
          light: '#FF8FA3',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#121212',
          darkCard: '#1E1E1E',
        },
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
