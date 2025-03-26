/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { promises as fs } from 'fs';
import { CodeSandbox } from '../../core/code/code-sandbox-common';

const BLOCK_MEMORY_LIMIT_IN_MB = system.getNumberOrThrow(
  AppSystemProp.CODE_BLOCK_MEMORY_LIMIT_IN_MB,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Check this https://github.com/laverdet/isolated-vm/issues/258#issuecomment-2134341086
let ivmCache: any;
const getIvm = () => {
  if (!ivmCache) {
    ivmCache = require('isolated-vm');
  }
  return ivmCache as typeof import('isolated-vm');
};

/**
 * Runs code in a V8 Isolate sandbox
 */
export const v8IsolateCodeSandbox: CodeSandbox = {
  async runCodeModule({ codeFile, inputs }) {
    const ivm = getIvm();
    const isolate = new ivm.Isolate({
      memoryLimit: BLOCK_MEMORY_LIMIT_IN_MB,
    });

    try {
      const isolateContext = await initIsolateContext({
        isolate,
        codeContext: {
          inputs,
        },
      });

      const code = await fs.readFile(codeFile, 'utf8');

      logger.debug('Running code module in V8 Isolate sandbox', { code });

      return await executeIsolate({
        isolate,
        isolateContext,
        code,
      });
    } finally {
      isolate.dispose();
    }
  },

  async runScript({ script, scriptContext }) {
    const ivm = getIvm();
    const isolate = new ivm.Isolate({
      memoryLimit: BLOCK_MEMORY_LIMIT_IN_MB,
    });

    try {
      // It is to avoid strucutedClone issue of proxy objects / functions, It will throw cannot be cloned error.
      const isolateContext = await initIsolateContext({
        isolate,
        codeContext: JSON.parse(JSON.stringify(scriptContext)),
      });

      return await executeIsolate({
        isolate,
        isolateContext,
        code: script,
      });
    } finally {
      isolate.dispose();
    }
  },
};

const initIsolateContext = async ({
  isolate,
  codeContext,
}: InitContextParams): Promise<any> => {
  const isolateContext = await isolate.createContext();
  const ivm = getIvm();
  for (const [key, value] of Object.entries(codeContext)) {
    await isolateContext.global.set(
      key,
      new ivm.ExternalCopy(value).copyInto(),
    );
  }

  return isolateContext;
};

const executeIsolate = async ({
  isolate,
  isolateContext,
  code,
}: ExecuteIsolateParams): Promise<unknown> => {
  const isolateScript = await isolate.compileScript(code);

  const outRef = await isolateScript.run(isolateContext, {
    reference: true,
    promise: true,
  });

  return outRef.copy();
};

type InitContextParams = {
  isolate: any;
  codeContext: Record<string, unknown>;
};

type ExecuteIsolateParams = {
  isolate: any;
  isolateContext: unknown;
  code: string;
};
