import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths() as unknown as PluginOption,
    tailwindcss() as unknown as PluginOption,
    reactRouter() as unknown as PluginOption,
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react') || id.includes('date-fns')) return 'vendor-ui';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['framer-motion', '@tanstack/react-query', 'lucide-react'],
  },
});
