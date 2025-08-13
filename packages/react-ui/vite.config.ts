import path from 'path';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import circleDependency from 'vite-plugin-circular-dependency';
import commonjs from 'vite-plugin-commonjs';

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
      '@openops/ui-kit': path.resolve(
        __dirname,
        '../../packages/ee/ui-kit/src',
      ),
    },
  },
  plugins: [
    react(),
    commonjs(),
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
