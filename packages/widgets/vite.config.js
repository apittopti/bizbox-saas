import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'examples',
  server: {
    port: 3001,
    open: true,
    cors: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      name: 'BizBox',
      formats: ['umd', 'es'],
      fileName: (format) => `embed.${format === 'es' ? 'esm.js' : 'js'}`
    },
    rollupOptions: {
      output: {
        // Provide global variables for UMD build
        globals: {}
      }
    }
  }
});