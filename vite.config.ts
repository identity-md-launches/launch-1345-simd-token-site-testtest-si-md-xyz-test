import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * In production the host serves /simd-coin.json on the same origin.
 * For local dev and preview this plugin answers that route with mock/simd-coin.json
 * so the live-data widgets can be exercised without the real host.
 * The mock is never copied into dist/.
 */
function mockCoinJson(): Plugin {
  const serve = (server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) => {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.split('?')[0].endsWith('/simd-coin.json')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(resolve(__dirname, 'mock/simd-coin.json'), 'utf8'));
        return;
      }
      next();
    });
  };
  return {
    name: 'mock-simd-coin-json',
    configureServer: serve,
    configurePreviewServer: serve,
  };
}

export default defineConfig({
  root: 'site',
  base: './',
  publicDir: false,
  plugins: [mockCoinJson()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'site/index.html'),
        404: resolve(__dirname, 'site/404.html'),
      },
      output: {
        // Stable, un-hashed names so og:image / favicon URLs stay predictable
        // and the exported site mirrors the source tree.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
