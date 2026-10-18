import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const apiTarget = env.VITE_API_PROXY || "http://localhost:8080";
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: { "/api": { target: apiTarget, changeOrigin: false } },
    },
    preview: {
      proxy: { "/api": { target: apiTarget, changeOrigin: false } },
    },
  };
});
