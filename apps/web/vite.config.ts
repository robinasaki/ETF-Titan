import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tamaguiPlugin } from "@tamagui/vite-plugin";

export default defineConfig({
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
  },
});
