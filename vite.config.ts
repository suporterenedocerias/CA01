import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    // Remove console.log em produção
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Recharts só é usado em admin/CEO — chunk separado com lazy load
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          // Framer Motion só é usado no hero
          if (id.includes("framer-motion")) return "motion";
          // Supabase separado do React
          if (id.includes("@supabase")) return "supabase";
        },
      },
    },
  },
}));
