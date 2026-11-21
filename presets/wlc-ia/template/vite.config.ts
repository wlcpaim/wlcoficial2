import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// O servidor de IA (server/index.mjs) roda em outra porta; o Vite repassa /api para ele.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
