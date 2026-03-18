import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("react-dom") || id.includes("react-router"))
            return "react-vendor";
          if (id.includes("react")) return "react-vendor";
          if (id.includes("recharts") || id.includes("framer-motion"))
            return "charts-motion";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
}));
