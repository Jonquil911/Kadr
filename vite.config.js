import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// На GitHub Pages сайт живёт по адресу https://<user>.github.io/<repo>/,
// поэтому при сборке в GitHub Actions передаётся BASE_PATH=/<repo>/.
// Локально (npm run dev) база остаётся "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173, open: true },
});
