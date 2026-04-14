import { reactRouter } from "@react-router/dev/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
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
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@tiptap/') || id.includes('lowlight') || id.includes('highlight.js')) return 'vendor-editor';
            if (id.includes('recharts') || id.includes('react-big-calendar')) return 'vendor-charts';
            if (id.includes('lucide-react') || id.includes('date-fns')) return 'vendor-ui';
            if (id.includes('@radix-ui/') || id.includes('cmdk') || id.includes('react-hot-toast') || id.includes('katex')) return 'vendor-app';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['framer-motion', '@tanstack/react-query', 'lucide-react'],
  },
});
