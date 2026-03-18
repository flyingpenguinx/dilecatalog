import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'images/**/*', dest: 'images' },
        { src: 'logos/**/*', dest: 'logos' },
        { src: 'CNAME', dest: '.' },
      ],
    }),
  ],
});