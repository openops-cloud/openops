import {
  cacheHandler,
  fileExists,
  logger,
  memoryLock,
  packageManager,
  SharedSystemProp,
  system,
  threadSafeMkdir,
} from '@openops/server-shared';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolver from '@rollup/plugin-node-resolve';
import fs, { rm } from 'node:fs/promises';
import path from 'node:path';
import { rollup } from 'rollup';
import { ExecutionMode } from '../core/code/execution-mode';
import { CodeArtifact } from './code-artifact';

const executionMode = system.get<ExecutionMode>(
  SharedSystemProp.EXECUTION_MODE,
);

const TS_CONFIG_CONTENT = JSON.stringify({
  extends: '@tsconfig/node20/tsconfig.json',
  compilerOptions: {
    module: 'node16',
    lib: ['es2023', 'dom'],
    skipLibCheck: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    strict: false,
    strictPropertyInitialization: false,
    strictNullChecks: false,
    strictFunctionTypes: false,
    strictBindCallApply: false,
    noImplicitAny: false,
    noImplicitThis: false,
    noImplicitReturns: false,
    noFallthroughCasesInSwitch: false,
  },
});

enum CacheState {
  READY = 'READY',
  PENDING = 'PENDING',
}

export const codeBuilder = {
  getCodesFolder({
    codesFolderPath,
    flowVersionId,
    flowRunId,
  }: {
    codesFolderPath: string;
    flowVersionId: string;
    flowRunId: string;
  }): string {
    return path.join(codesFolderPath, flowVersionId, flowRunId);
  },
  async processCodeStep({
    artifact,
    codesFolderPath,
  }: ProcessCodeStepParams): Promise<void> {
    const { sourceCode, flowRunId, flowVersionId, name } = artifact;
    const flowVersionPath = codeBuilder.getCodesFolder({
      codesFolderPath,
      flowVersionId,
      flowRunId,
    });
    const codePath = path.join(flowVersionPath, name);

    logger.debug('Preparing the code block.', {
      stepName: name,
      codePath,
      sourceCode,
      flowRunId,
    });

    const lock = await memoryLock.acquire(
      `code-builder-${flowVersionId}-${flowRunId}-${name}`,
    );
    try {
      const cache = cacheHandler(codePath);
      const fState = await cache.cacheCheckState(codePath);
      if (fState === CacheState.READY) {
        logger.debug('The code is already ready in the system.');
        return;
      }
      const { code, packageJson } = sourceCode;

      const codeNeedCleanUp =
        fState === CacheState.PENDING && (await fileExists(codePath));
      if (codeNeedCleanUp) {
        await rm(codePath, { recursive: true, force: true });
      }

      await threadSafeMkdir(codePath);

      await cache.setCache(codePath, CacheState.PENDING);

      await installDependencies({
        path: codePath,
        packageJson:
          executionMode == ExecutionMode.SANDBOX_CODE_ONLY
            ? JSON.stringify({ ...JSON.parse(packageJson), type: 'module' })
            : packageJson,
      });

      await compileCode({
        globalCodePath: codesFolderPath,
        path: codePath,
        code,
      });

      await cache.setCache(codePath, CacheState.READY);
    } catch (error: unknown) {
      logger.error('Failed to prepare a code block.', { codePath, error });
      throw error;
    } finally {
      await lock.release();
    }
  },
};

const installDependencies = async ({
  path,
  packageJson,
}: InstallDependenciesParams): Promise<void> => {
  await fs.writeFile(`${path}/package.json`, packageJson, 'utf8');
  await packageManager.exec({ path, command: 'install' });
};

const compileCode = async ({
  globalCodePath,
  path,
  code,
}: CompileCodeParams): Promise<void> => {
  await fs.writeFile(`${path}/tsconfig.json`, TS_CONFIG_CONTENT, {
    encoding: 'utf8',
    flag: 'w',
  });
  await fs.writeFile(`${path}/index.ts`, code, { encoding: 'utf8', flag: 'w' });

  await packageManager.exec({
    path: globalCodePath,
    command: 'tsc',
    args: ['--build', path],
  });

  if (executionMode == ExecutionMode.SANDBOX_CODE_ONLY) {
    const built = await rollup({
      input: `${path}/index.js`,
      plugins: [
        commonjs({
          include: /node_modules/,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          requireReturnsDefault: 'esmExternals',
        }),
        nodeResolver({ exportConditions: ['node', 'require', 'import'] }),
        json(),
      ],
    });
    const compiledCode = await built.generate({ format: 'cjs', name: 'code' });
    const vmReadyCode = compiledCode.output[0].code;
    await fs.writeFile(
      `${path}/index.js`,
      `let require = () => ({});
             let exports = {};
             ${vmReadyCode};
             code(inputs);`,
      { encoding: 'utf8', flag: 'w' },
    );
  }
};

type ProcessCodeStepParams = {
  artifact: CodeArtifact;
  codesFolderPath: string;
};

type InstallDependenciesParams = {
  path: string;
  packageJson: string;
};

type CompileCodeParams = {
  globalCodePath: string;
  path: string;
  code: string;
};
