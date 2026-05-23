import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Strip type="module" so the file works when opened directly via file:// in browsers
// that restrict module scripts on local files. The bundle is self-contained IIFE-like
// after rollup, so it runs fine as a classic script.
function stripModuleType() {
  return {
    name: 'strip-module-type',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module"([^>]*)>/g, '<script$1>')
        .replace(/\scrossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile({ removeViteModuleLoader: true, useRecommendedBuildConfig: true }),
    stripModuleType(),
  ],
  base: './',
  build: {
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
