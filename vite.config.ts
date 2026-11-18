import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // GitHub Pages: BASE_PATH arriva da actions/configure-pages (es. "/ArtWall-3D-Studio").
  // In fallback usiamo un base relativo così gli asset funzionano con qualunque nome di repo.
  const isGitHubPages = process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const basePath = process.env.BASE_PATH || (isGitHubPages || mode === 'production' ? './' : '/');

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('@react-three')) return 'r3f';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
