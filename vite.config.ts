import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  server: {
    host: "localhost",
    port: 5187,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store",
    },
  },
  preview: {
    host: "localhost",
    port: 5188,
    strictPort: true,
  },
  build: {
    assetsInlineLimit: 100_000_000,
  },
});
