import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  // SPA fallback: todas las rutas devuelven index.html
  appType: 'spa'
});
