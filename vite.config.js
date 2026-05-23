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
      // 1) Strip type="module"/crossorigin so the file works from file:// in
      //    browsers that block module scripts on local files (esp. Chrome/Edge).
      // 2) The inline script then becomes synchronous (defer doesn't apply to
      //    inline scripts), so move it from <head> to the end of <body> so
      //    #root exists when the bootstrap runs.
      const scriptMatch = html.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/);
      if (scriptMatch) {
        const cleaned = scriptMatch[0]
          .replace(/<script type="module"([^>]*)>/, '<script$1>')
          .replace(/\scrossorigin/g, '');
        html = html.replace(scriptMatch[0], '');
        html = html.replace('</body>', `  ${cleaned}\n  </body>`);
      }
      return html;
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
