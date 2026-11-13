import importFresh from 'import-fresh';
import { CodeModule, CodeSandbox } from './code-sandbox-common';

const SESSION_DISPOSED = 'Script session is disposed';

/**
 * Runs code without a sandbox.
 */
export const noOpCodeSandbox: CodeSandbox = {
  async runCodeModule({ codeFile, isFreshImport, inputs }) {
    const codeModule: CodeModule = isFreshImport
      ? await importFresh(codeFile)
      : await import(codeFile);
    return codeModule.code(inputs);
  },

  async runScript({ script, scriptContext }) {
    const params = Object.keys(scriptContext);
    const args = Object.values(scriptContext);
    const body = `return (${script})`;
    const fn = Function(...params, body);
    return fn(...args);
  },

  createScriptSession() {
    let disposed = false;
    return Promise.resolve({
      async run(
        script: string,
        globals: Record<string, unknown>,
      ): Promise<unknown> {
        if (disposed) {
          throw new Error(SESSION_DISPOSED);
        }
        // Mirror the isolate sandbox: scripts see a JSON copy of their globals (no mutation leaks into the
        // next run) and results come back through a structured clone, which rejects functions and the like.
        const scriptContext = JSON.parse(JSON.stringify(globals));
        return structuredClone(
          await noOpCodeSandbox.runScript({ script, scriptContext }),
        );
      },
      dispose(): void {
        disposed = true;
      },
    });
  },
};
