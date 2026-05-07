// This file has been automatically migrated to valid ESM format by Storybook.
import type { StorybookConfig } from '@storybook/react-vite';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path, { dirname, join } from 'node:path';
import tailwindcss from 'tailwindcss';
import resolveConfig from 'tailwindcss/resolveConfig.js';
import { mergeConfig } from 'vite';
import tailwindConfig from '../tailwind.config.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

const fullConfig = resolveConfig(tailwindConfig);
const virtualModuleId = 'virtual:tailwind-config';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

const config: StorybookConfig = {
  addons: [getAbsolutePath('@storybook/addon-docs')],
  stories: ['../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  staticDirs: ['../static', '../../react-ui/public'],
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [
        react(),
        nxViteTsPaths(),
        {
          name: 'tailwind-config-module',
          resolveId(id: string) {
            if (id === virtualModuleId) {
              return resolvedVirtualModuleId;
            }
          },
          load(id: string) {
            if (id === resolvedVirtualModuleId) {
              return `export const config = ${JSON.stringify(
                fullConfig,
                null,
                2,
              )}`;
            }
          },
        },
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          '@tailwindConfig': path.resolve(__dirname, '../tailwind.config.cjs'),
        },
      },
      css: {
        postcss: {
          plugins: [tailwindcss('./tailwind.config.cjs'), autoprefixer],
        },
      },
      optimizeDeps: {
        include: ['@tailwindConfig'],
        exclude: [virtualModuleId],
      },
      build: {
        commonjsOptions: {
          transformMixedEsModules: true,
        },
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (id === resolvedVirtualModuleId) {
                return 'tailwind-config';
              }
            },
          },
        },
      },
    }),
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
