export type CodeModule = {
  code(input: unknown): Promise<unknown>;
};

export type CodeSandbox = {
  /**
   * Executes a {@link CodeModule}.
   */
  runCodeModule(params: RunCodeModuleParams): Promise<unknown>;

  /**
   * Executes a script.
   */
  runScript(params: RunScriptParams): Promise<unknown>;

  /**
   * Creates a session that evaluates many scripts in one sandbox instance, each in a fresh context.
   */
  createScriptSession(): Promise<ScriptSession>;
};

export type ScriptSession = {
  /**
   * Evaluates `script` in a new context whose only globals are `globals`. Runs are serialized, so a
   * script that exhausts the sandbox cannot affect another run. Rejects on any evaluation error.
   */
  run(script: string, globals: Record<string, unknown>): Promise<unknown>;

  /**
   * Releases the sandbox instance. Idempotent; later runs reject.
   */
  dispose(): void;
};

type RunCodeModuleParams = {
  /**
   * The path of the code file.
   */
  codeFile: string;

  /**
   * Whether the import should be fresh or not.
   */
  isFreshImport: boolean;

  /**
   * The inputs that are passed to the {@link CodeModule}.
   */
  inputs: Record<string, unknown>;
};

type RunScriptParams = {
  /**
   * A serialized script that will be executed in the sandbox.
   * The script can either be sync or async.
   */
  script: string;

  /**
   * A key-value map of variables available to the script during execution.
   */
  scriptContext: Record<string, unknown>;
};
