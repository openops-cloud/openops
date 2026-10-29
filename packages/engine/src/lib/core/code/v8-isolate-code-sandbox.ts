/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { promises as fs } from 'fs';
import {
  CodeSandbox,
  ScriptSession,
} from '../../core/code/code-sandbox-common';
import { BASE64_POLYFILL } from './polyfills/base64-polyfill';

const BLOCK_MEMORY_LIMIT_IN_MB = system.getNumberOrThrow(
  AppSystemProp.CODE_BLOCK_MEMORY_LIMIT_IN_MB,
);

const SESSION_DISPOSED = 'Script session is disposed';

// Check this https://github.com/laverdet/isolated-vm/issues/258#issuecomment-2134341086
let ivmCache: any;
const getIvm = () => {
  if (!ivmCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must stay a lazy require; see the isolated-vm issue linked above
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

  createScriptSession,
};

/**
 * One isolate shared by many runs, each in a fresh context. Globals are copied out of the host once per
 * value (memoized by identity, so a step output referenced by many scripts is serialized once) and
 * copied into each context. Runs are serialized: a memory-limit kill disposes the isolate, which would
 * reject every queued run, and concurrently alive contexts would share the isolate's memory limit.
 */
async function createScriptSession(): Promise<ScriptSession> {
  const ivm = getIvm();
  let isolate = new ivm.Isolate({ memoryLimit: BLOCK_MEMORY_LIMIT_IN_MB });
  let polyfill = await isolate.compileScript(BASE64_POLYFILL);
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  const copies: any[] = [];
  const copiesByValue = new WeakMap<object, any>();

  const externalCopyOf = (value: object): any => {
    let copy = copiesByValue.get(value);
    if (!copy) {
      copy = new ivm.ExternalCopy(value);
      copiesByValue.set(value, copy);
      copies.push(copy);
    }
    return copy;
  };

  const ensureAlive = async (): Promise<void> => {
    if (disposed) {
      throw new Error(SESSION_DISPOSED);
    }
    if (isolate.isDisposed) {
      // a previous run hit the memory limit; the host-side copies survive, only the isolate is rebuilt
      isolate = new ivm.Isolate({ memoryLimit: BLOCK_MEMORY_LIMIT_IN_MB });
      polyfill = await isolate.compileScript(BASE64_POLYFILL);
    }
  };

  const runOnce = async (
    script: string,
    globals: Record<string, unknown>,
  ): Promise<unknown> => {
    await ensureAlive();
    const context = await isolate.createContext();
    let compiled: any;
    let outRef: any;
    try {
      for (const [key, value] of Object.entries(globals)) {
        // primitives transfer as-is; objects go through the memoized ExternalCopy
        const transferable =
          typeof value === 'object' && value !== null
            ? externalCopyOf(value).copyInto()
            : value;
        await context.global.set(key, transferable);
      }
      await polyfill.run(context);
      compiled = await isolate.compileScript(script);
      outRef = await compiled.run(context, { reference: true, promise: true });
      return await outRef.copy();
    } finally {
      releaseQuietly(outRef);
      releaseQuietly(compiled);
      releaseQuietly(context);
    }
  };

  return {
    run(script: string, globals: Record<string, unknown>): Promise<unknown> {
      const result = queue.then(() => runOnce(script, globals));
      queue = result.catch(() => undefined);
      return result;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const copy of copies) {
        releaseQuietly(copy);
      }
      if (!isolate.isDisposed) {
        isolate.dispose();
      }
    },
  };
}

const releaseQuietly = (handle: { release(): void } | undefined): void => {
  try {
    handle?.release();
  } catch {
    // already released with the isolate
  }
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

  // Define web-standard globals (btoa/atob) on the context before user code runs.
  const bootstrap = await isolate.compileScript(BASE64_POLYFILL);
  await bootstrap.run(isolateContext);

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
