import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  root: __dirname,
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "GymOs Management System",
        short_name: "GymOs",
        description:
          "Professional gym management system for tracking members and subscriptions",
        start_url: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#1a2332",
        orientation: "portrait-primary",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
}));
