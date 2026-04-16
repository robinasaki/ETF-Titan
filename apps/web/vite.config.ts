import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { tamaguiPlugin } from "@tamagui/vite-plugin";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  plugins: [
    react(),
    tamaguiPlugin({
      config: "../../packages/shared/src/theme.tamagui.ts",
      components: ["tamagui"],
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/etfs": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
