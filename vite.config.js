import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// На GitHub Pages сайт живёт по адресу https://<user>.github.io/<repo>/,
// поэтому при сборке в GitHub Actions передаётся BASE_PATH=/<repo>/.
// Локально (npm run dev) база остаётся "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      // Свой Service Worker (src/sw.js): плагин только подставляет в него список файлов сборки
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // Регистрируем сами через virtual:pwa-register/react (см. PwaUpdatePrompt.jsx)
      injectRegister: false,
      // Манифест лежит в public/manifest.json и подключён в index.html вручную
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        globIgnores: ['404.html'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      // В режиме npm run dev Service Worker выключен, чтобы не мешал разработке.
      // Проверять PWA: npm run build && npm run preview
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, open: true },
});
