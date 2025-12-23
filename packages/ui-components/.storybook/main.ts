import type { StorybookConfig } from '@storybook/react-vite';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import tailwindcss from 'tailwindcss';
import resolveConfig from 'tailwindcss/resolveConfig';
import { mergeConfig } from 'vite';
import tailwindConfig from '../tailwind.config.cjs';

const fullConfig = resolveConfig(tailwindConfig);
const virtualModuleId = 'virtual:tailwind-config';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

const config: StorybookConfig = {
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  stories: ['../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],

  framework: {
    name: '@storybook/react-vite',
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
