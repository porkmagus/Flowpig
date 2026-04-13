import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss({
      config: {
        content: [
          "./src/**/*.{ts,tsx}",
          "./src/app/**/*.{ts,tsx}",
          "./src/components/**/*.{ts,tsx}",
        ],
        theme: {
          extend: {
            colors: {
              'linear-bg': 'hsl(var(--color-linear-bg) / <alpha-value>)',
              'linear-surface': 'hsl(var(--color-linear-surface) / <alpha-value>)',
              'linear-elevated': 'hsl(var(--color-linear-elevated) / <alpha-value>)',
              'linear-border': 'hsl(var(--color-linear-border) / <alpha-value>)',
              'linear-text': 'hsl(var(--color-linear-text) / <alpha-value>)',
              'linear-accent': 'hsl(var(--color-linear-accent) / <alpha-value>)',
              'linear-accent-hover': 'hsl(var(--color-linear-accent-hover) / <alpha-value>)',
              'linear-error': 'hsl(var(--color-linear-error) / <alpha-value>)',
            },
          },
        },
      },
    }),
    reactRouter()
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
