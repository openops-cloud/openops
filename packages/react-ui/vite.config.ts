import path from 'path';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import checker from 'vite-plugin-checker';
import circleDependency from 'vite-plugin-circular-dependency';

const guardCssPlugin = (): Plugin => ({
  name: 'react-ui-css-guard',
  enforce: 'pre',
  configResolved(config) {
    const cssPlugins = config.plugins.filter((plugin) => plugin.name === 'vite:css');
    for (const cssPlugin of cssPlugins) {
      const transform = (cssPlugin as { transform?: { handler?: (...args: unknown[]) => unknown } } | undefined)?.transform;
      const originalHandler = transform?.handler;
      if (!originalHandler) {
        continue;
      }

      transform.handler = function (this: unknown, code: string, id: string, ...args: unknown[]) {
        if (id.includes('html-proxy') || id.endsWith('.html')) {
          return null;
        }

        return originalHandler.call(this, code, id, ...args);
      };
    }
  },
});

const guardJsonPlugin = (): Plugin => ({
  name: 'react-ui-json-guard',
  enforce: 'pre',
  configResolved(config) {
    const jsonPlugins = config.plugins.filter((plugin) => plugin.name === 'vite:json');
    for (const jsonPlugin of jsonPlugins) {
      const transform = (jsonPlugin as { transform?: { handler?: (...args: unknown[]) => unknown } } | undefined)?.transform;
      const originalHandler = transform?.handler;
      if (!originalHandler) {
        continue;
      }

      transform.handler = function (this: unknown, code: string, id: string, ...args: unknown[]) {
        if (!/\.json(?:$|\?)/.test(id)) {
          return null;
        }

        return originalHandler.call(this, code, id, ...args);
      };
    }
  },
});

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/react-ui',

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        secure: false,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          Host: '127.0.0.1:4200',
        },
        ws: true,
      },
    },
    port: 4200,
    host: '0.0.0.0',
  },

  preview: {
    port: 4200,
    host: 'localhost',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@openops/components/ui': path.resolve(
        __dirname,
        '../../packages/ui-components/src',
      ),
      '@openops/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@openops/blocks-framework': path.resolve(
        __dirname,
        '../../packages/blocks/framework/src',
      ),
      '@openops/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src'),
    },
  },
  plugins: [
    guardJsonPlugin(),
    guardCssPlugin(),
    react(),
    nxViteTsPaths(),
    checker({
      typescript: true,
    }),
    circleDependency({
      exclude: ['**/node_modules/**', '**/auto-properties-form.tsx'],
    }),
  ],

  build: {
    outDir: '../../dist/packages/react-ui',
    emptyOutDir: true,
    reportCompressedSize: true,
    modulePreload: {
      polyfill: false,
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onLog(level, log, handler) {
        if (
          log.cause &&
          log.message.includes(`Can't resolve original location of error.`)
        ) {
          return;
        }
        handler(level, log);
      },
    },
  },
});
