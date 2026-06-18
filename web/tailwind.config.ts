/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind escaneia estes arquivos para saber quais classes usar
  // Classes não usadas são removidas no build de produção (tree-shaking)
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    extend: {
      // Cores customizadas do FleetMaster
      colors: {
        fleet: {
          primary: '#0F2B46',
          secondary: '#1B4965',
          accent: '#F77F00',
          success: '#06D6A0',
          warning: '#FFD166',
          danger: '#EF476F',
          info: '#118AB2',
        },
      },
      // Fontes customizadas
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
