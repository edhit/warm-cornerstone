import { defineConfig } from "vite";

// Чистый статический SPA: без SSR и без сервера.
// Сборка кладёт index.html и /public в dist, готовый к заливке в Yandex Object Storage.
export default defineConfig({
  server: { host: "::", port: 8080, strictPort: true },
  preview: { host: "::", port: 8080, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
