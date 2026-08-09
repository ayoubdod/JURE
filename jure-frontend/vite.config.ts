import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { seoGenerationPlugin } from "./scripts/seo-generate";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    seoGenerationPlugin(),
    // componentTagger supprimé car non installéé
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
