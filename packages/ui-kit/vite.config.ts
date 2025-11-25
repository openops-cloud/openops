import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import dts from 'vite-plugin-dts';

const guardJsonPlugin = (): Plugin => ({
  name: 'ui-kit-json-guard',
  enforce: 'pre',
  configResolved(config) {
    const jsonPlugin = config.plugins.find((plugin) => plugin.name === 'vite:json');
    const transform = (jsonPlugin as { transform?: { handler?: (...args: unknown[]) => unknown } } | undefined)?.transform;
    const originalHandler = transform?.handler;
    if (!originalHandler) {
      return;
    }

    transform.handler = function (this: unknown, code: string, id: string, ...args: unknown[]) {
      if (!/\.json(?:$|\?)/.test(id)) {
        return null;
      }

      return originalHandler.call(this, code, id, ...args);
    };
  },
});

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/ui-kit',

  plugins: [
    guardJsonPlugin(),
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
  ],

  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: '../../dist/packages/ui-kit',
    emptyOutDir: true,
    reportCompressedSize: true,
    modulePreload: {
      polyfill: false,
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'ui-kit',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
