/**
 * Differential test: the rewritten resolver must return exactly what the legacy algorithm returned
 * (whole run state copied into a fresh sandbox run per token) for every token class, in both sandboxes.
 * The legacy algorithm is kept here as the reference implementation on purpose.
 */
import { ActionType, GenericStepOutput, LoopStepOutput, StepOutput, StepOutputStatus, TriggerType } from '@openops/shared';
import { CodeSandbox } from '../../src/lib/core/code/code-sandbox-common';
import { noOpCodeSandbox } from '../../src/lib/core/code/no-op-code-sandbox';
import { v8IsolateCodeSandbox } from '../../src/lib/core/code/v8-isolate-code-sandbox';
import { FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context';
import { flowExecutor } from '../../src/lib/handler/flow-executor';
import { createPropsResolver } from '../../src/lib/variables/props-resolver';
import { buildCodeAction, buildSimpleLoopAction, generateMockEngineConstants } from '../handler/test-helper';

const mockSandboxHolder: { current: CodeSandbox } = { current: noOpCodeSandbox };
jest.mock('../../src/lib/core/code/code-sandbox', () => ({
  initCodeSandbox: async () => mockSandboxHolder.current,
}));

const mockObtain = jest.fn();
jest.mock('../../src/lib/services/connections.service', () => ({
  createConnectionService: () => ({ obtain: mockObtain }),
}));

jest.mock('../../src/lib/code-block/prepare-code-block.ts', () => ({ prepareCodeBlock: jest.fn() }));
jest.mock('../../src/lib/services/storage.service', () => ({
  createContextStore: jest.fn().mockImplementation(() => ({ get: jest.fn(), put: jest.fn() })),
}));
jest.mock('../../src/lib/services/progress.service', () => ({
  progressService: { sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()) },
}));

const step = (type: ActionType | TriggerType, output: unknown): StepOutput =>
  GenericStepOutput.create({ type, status: StepOutputStatus.SUCCEEDED, input: {}, output }) as unknown as StepOutput;

const bigArray = Array.from({ length: 5000 }, (_, i) => ({ i, name: `item-${i}` }));

const buildState = () => {
  const iterations = [
    { inner: step(ActionType.BLOCK, { value: 'it0' }) },
    { inner: step(ActionType.BLOCK, { value: 'it1' }), step_3: step(ActionType.BLOCK, 'shadowed') },
  ];
  const root = FlowExecutorContext.empty()
    .upsertStep(
      'trigger',
      step(TriggerType.BLOCK, {
        name: 'John',
        price: 6.4,
        items: [5, 'a', { deep: { x: 'y' } }],
        nullField: null,
        undefinedField: undefined,
        nan: NaN,
        date: new Date('2024-01-02T03:04:05Z'),
        big: bigArray,
        "it's": 'apostrophe',
        'a"b': 'dquote',
        'a\\b': 'backslash',
        'a’b': 'curly',
        'line\nbreak': 'newline',
        memory: 'memory://{"fileName":"hello.png","data":"iVBORw0KGgo"}',
      }),
    )
    .upsertStep('step_1', step(ActionType.BLOCK, 'memory://{"fileName":"hello.png","data":"iVBORw0KGgo"}'))
    .upsertStep('step_2', step(ActionType.BLOCK, undefined))
    .upsertStep('step_3', step(ActionType.BLOCK, null))
    .upsertStep('step_4', step(ActionType.BLOCK, { arr: Object.assign([1, 2], { foo: 'bar' }), buf: Buffer.from('hi') }))
    .upsertStep('step_10', step(ActionType.BLOCK, { ten: true }))
    .upsertStep('inner', step(ActionType.BLOCK, { value: 'root-inner' }))
    .upsertStep('loop', step(ActionType.LOOP_ON_ITEMS, { item: 'b', index: 2, iterations }));
  return root.setCurrentPath(root.currentPath.loopIteration({ loopName: 'loop', iteration: 1 }));
};

const CORPUS = [
  'trigger',
  'trigger.name',
  ' trigger.name ',
  'trigger.items[0]',
  "trigger.items['1']",
  'trigger.items[2].deep.x',
  "trigger['items'][2]['deep']['x']",
  'trigger["items"][2]["deep"]["x"]',
  'trigger.items.length',
  'trigger.items.map',
  'trigger.missing',
  'trigger.missing.deep',
  'trigger.nullField',
  'trigger.nullField.x',
  'trigger.undefinedField',
  'trigger.undefinedField.x',
  'trigger.name.length',
  'trigger.name[0]',
  'trigger.name.toUpperCase',
  'trigger.items.map.caller',
  'trigger.items.map.arguments',
  'trigger.name.toUpperCase.caller',
  'trigger.items.map.name',
  'trigger.name.at.name',
  'trigger.date',
  'trigger.date.length',
  'trigger.nan',
  'trigger.big.length',
  'trigger.big[4999].name',
  "trigger['it\\'s']",
  'trigger["a\\"b"]',
  "trigger['a\\\\b']",
  "trigger['a\\’b']",
  "trigger['line\\nbreak']",
  'trigger.memory',
  'step_1',
  'step_1.length',
  'step_2',
  "step_2 || 'd'",
  'step_3',
  "step_3 || 'd'",
  'step_4.arr',
  'step_4.arr.foo',
  'step_4.arr.length',
  'step_4.buf',
  'step_4.buf.data',
  'step_10.ten',
  'loop.item',
  'loop.index',
  'loop',
  'inner',
  'inner.value',
  'step_3',
  'nope',
  'nope.x',
  'Math.PI',
  'JSON',
  'Infinity',
  'undefined',
  'NaN',
  'true',
  'false',
  'null',
  'this',
  '[4,5,6]',
  '1+2',
  'Math.min(trigger.price, 2)',
  'trigger.price + 2 - 3',
  'trigger?.name',
  'trigger.constructor.name',
  'trigger.__proto__',
  "trigger['__proto__']",
  'trigger.prototype',
  'toString',
  'hasOwnProperty',
  'globalThis.trigger.name',
  'this.trigger',
  "btoa('hi')",
  '',
  '   ',
  'a' + '.b'.repeat(5000),
  'x'.repeat(10_000),
];

type Resolver = ReturnType<typeof createPropsResolver>;

const jsonClone = (value: unknown) => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? undefined : JSON.parse(serialized);
};

/**
 * The legacy algorithm. For the isolate sandbox this is exactly what production ran. The no-op
 * sandbox used to hand scripts live references and return live results; the rewrite gives it the
 * view production always had (the one accepted behaviour change): a JSON copy of the state in, a
 * structured clone of the result out (functions and other non-cloneable results become '').
 */
const legacyToken = async (sandbox: CodeSandbox, expression: string, state: FlowExecutorContext) => {
  const normalize = sandbox === noOpCodeSandbox;
  try {
    const scriptContext = normalize ? jsonClone({ ...state.currentState() }) : { ...state.currentState() };
    const result = await sandbox.runScript({ script: expression, scriptContext });
    return (normalize ? structuredClone(result) : result) ?? '';
  } catch {
    return '';
  }
};

describe.each<[string, CodeSandbox]>([
  ['no-op sandbox', noOpCodeSandbox],
  ['v8 isolate sandbox', v8IsolateCodeSandbox],
])('props resolver differential — %s', (_name, sandbox) => {
  let resolver: Resolver;
  let executionState: FlowExecutorContext;

  beforeAll(() => {
    mockSandboxHolder.current = sandbox;
    resolver = createPropsResolver({ projectId: 'PROJECT_ID', engineToken: 'WORKER_TOKEN', apiUrl: 'http://127.0.0.1:3000' });
    executionState = buildState();
  });

  beforeEach(() => {
    mockObtain.mockReset();
  });

  test.each(CORPUS.map((expression) => [expression.length > 60 ? expression.slice(0, 57) + '...' : expression, expression]))(
    'single token {{%s}} matches legacy',
    async (_label, expression) => {
      const expected = await legacyToken(sandbox, expression, executionState);
      const { resolvedInput, censoredInput } = await resolver.resolve({
        unresolvedInput: `{{${expression}}}`,
        executionState,
      });
      expect(resolvedInput).toEqual(expected);
      expect(censoredInput).toEqual(expected);
    },
  );

  test('template with several tokens matches legacy rendering', async () => {
    const expression = 'a={{trigger.items[2]}} b={{trigger.name}} n={{trigger.nullField}} u={{trigger.undefinedField}} f={{false}} z={{ 1 - 1 }}';
    const { resolvedInput } = await resolver.resolve({ unresolvedInput: expression, executionState });
    expect(resolvedInput).toEqual('a={"deep":{"x":"y"}} b=John n= u= f=false z=0');
  });

  test('object keys containing tokens are resolved', async () => {
    const { resolvedInput } = await resolver.resolve({
      unresolvedInput: { '{{trigger.name}}': 1, 'k_{{loop.index}}': { '{{inner.value}}': '{{trigger.price}}' } },
      executionState,
    });
    expect(resolvedInput).toEqual({ John: 1, k_2: { it1: 6.4 } });
  });

  test('a key resolving to an object throws Invalid key type', async () => {
    await expect(
      resolver.resolve({ unresolvedInput: { '{{trigger.items}}': 1 }, executionState }),
    ).rejects.toThrow('Invalid key type');
  });

  test('flattenNestedKeys multi-token input is zipped into an array of strings', async () => {
    const { resolvedInput } = await resolver.resolve({
      unresolvedInput: "{{flattenNestedKeys(trigger.items, ['x'])}} / {{trigger.items}}",
      executionState,
    });
    expect(resolvedInput).toEqual([' / 5', ' / a', ' / {"deep":{"x":"y"}}']);
  });

  test('connections are obtained once in the resolved pass and redacted in the censored pass', async () => {
    mockObtain.mockResolvedValue({ apiToken: 'secret', orgId: 'org-1' });
    const { resolvedInput, censoredInput } = await resolver.resolve({
      unresolvedInput: {
        whole: "{{connections['my-conn']}}",
        bracketPath: "{{connections['my-conn']['orgId']}}",
        dotted: '{{connections.my-conn.orgId}}',
        inText: "id={{connections['my-conn']['orgId']}}!",
      },
      executionState,
    });
    expect(censoredInput).toEqual({
      whole: '**REDACTED**',
      bracketPath: '**REDACTED**',
      dotted: '**REDACTED**',
      inText: 'id=**REDACTED**!',
    });
    expect(resolvedInput).toEqual({
      whole: { apiToken: 'secret', orgId: 'org-1' },
      // existing behaviour: the bracket form drops the sub-path (see parsePathAfterConnectionName)
      bracketPath: '',
      dotted: 'org-1',
      inText: 'id=!',
    });
    expect(mockObtain).toHaveBeenCalledTimes(4);
    expect(mockObtain).toHaveBeenCalledWith('my-conn');
  });

  test('no script session is created for path-only input, one for expression input, disposed once', async () => {
    const dispose = jest.fn();
    const original = sandbox.createScriptSession;
    const createSession = jest.spyOn(sandbox, 'createScriptSession').mockImplementation(async () => {
      const real = await original.call(sandbox);
      return {
        run: (script, globals) => real.run(script, globals),
        dispose: () => {
          dispose();
          real.dispose();
        },
      };
    });
    try {
      await resolver.resolve({
        unresolvedInput: { a: '{{trigger.name}}', b: "{{trigger['items'][0]}}", c: 'x {{loop.index}} y' },
        executionState,
      });
      expect(createSession).not.toHaveBeenCalled();

      await resolver.resolve({
        unresolvedInput: { a: '{{trigger.price + 1}}', b: '{{ [1,2] }}', c: 'x {{Math.max(1, loop.index)}} y' },
        executionState,
      });
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally {
      createSession.mockRestore();
    }
  });

  test('tokens never receive live references into run state', async () => {
    const before = JSON.stringify(executionState.currentState()['trigger']);
    const mutate = await resolver.resolve({
      unresolvedInput: { v: "{{ (trigger.items.push('x'), trigger.items.length) }}" },
      executionState,
    });
    expect(mutate.resolvedInput).toEqual({ v: 4 });
    const { resolvedInput } = await resolver.resolve({ unresolvedInput: '{{trigger.items}}', executionState });
    (resolvedInput as unknown[]).push('y');
    expect(JSON.stringify(executionState.currentState()['trigger'])).toEqual(before);
    expect((await resolver.resolve({ unresolvedInput: '{{trigger.items.length}}', executionState })).resolvedInput).toBe(3);
  });

  test('outputs that cannot be JSON-cloned yield empty strings without rejecting', async () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular['self'] = circular;
    let deep: Record<string, unknown> = { n: 0 };
    for (let i = 0; i < 20_000; i++) {
      deep = { n: i + 1, child: deep };
    }
    const poisoned = FlowExecutorContext.empty()
      .upsertStep('ok', step(ActionType.BLOCK, { v: 'fine' }))
      .upsertStep('big', step(ActionType.BLOCK, { big: BigInt(10), ok: 'fine' }))
      .upsertStep('circ', step(ActionType.BLOCK, circular))
      .upsertStep('deep', step(ActionType.BLOCK, deep));
    const { resolvedInput } = await resolver.resolve({
      unresolvedInput: {
        big: '{{big}}',
        bigLeaf: '{{big.big}}',
        bigOk: '{{big.ok}}',
        bigExpr: '{{big.ok + 1}}',
        circ: '{{circ}}',
        circA: '{{circ.a}}',
        circExpr: '{{circ.a + 1}}',
        deep: '{{deep}}',
        deepN: '{{deep.n}}',
        ok: '{{ok.v}}',
        okExpr: "{{ok.v + '!'}}",
      },
      executionState: poisoned,
    });
    // tokens on the poisoned step are '' as before; unrelated steps are no longer poisoned (accepted)
    expect(resolvedInput).toEqual({
      big: '',
      bigLeaf: '',
      bigOk: 'fine',
      bigExpr: '',
      circ: '',
      circA: 1,
      circExpr: '',
      deep: '',
      deepN: 20_000,
      ok: 'fine',
      okExpr: 'fine!',
    });
  });

  test('a step named like a global shadows it exactly as the legacy globals did', async () => {
    const shadowing = FlowExecutorContext.empty()
      .upsertStep('Math', step(ActionType.BLOCK, { PI: 1 }))
      .upsertStep('JSON', step(ActionType.BLOCK, 'json-step'))
      .upsertStep('btoa', step(ActionType.BLOCK, { x: 1 }));
    for (const expression of ['Math.PI', 'Math', 'JSON', 'JSON.length', 'btoa', "btoa('hi')", 'Math.PI + 1']) {
      const expected = await legacyToken(sandbox, expression, shadowing);
      const { resolvedInput } = await resolver.resolve({ unresolvedInput: `{{${expression}}}`, executionState: shadowing });
      expect({ expression, value: resolvedInput }).toEqual({ expression, value: expected });
    }
  });

  test('a string trigger output resolves sub-paths like the legacy sandbox', async () => {
    const stringTrigger = FlowExecutorContext.empty().upsertStep('trigger', step(TriggerType.BLOCK, 'hello world!'));
    for (const expression of ['trigger.body', 'trigger.length', 'trigger[0]', 'trigger']) {
      const expected = await legacyToken(sandbox, expression, stringTrigger);
      const { resolvedInput } = await resolver.resolve({ unresolvedInput: `{{${expression}}}`, executionState: stringTrigger });
      expect({ expression, value: resolvedInput }).toEqual({ expression, value: expected });
    }
  });

  test('loop item/index are fresh on every iteration for path and expression tokens', async () => {
    const result = await flowExecutor.executeFromAction({
      action: buildSimpleLoopAction({
        name: 'loop',
        loopItems: '{{ [4,5,6] }}',
        firstLoopAction: buildCodeAction({
          name: 'echo_step',
          input: { index: '{{loop.index}}', item: "{{loop['item']}}", sum: '{{loop.index + loop.item}}' },
        }),
      }),
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });
    const loopOut = result.steps.loop as LoopStepOutput;
    expect(loopOut.output?.iterations.map((it) => it['echo_step'].input)).toEqual([
      { index: 1, item: 4, sum: 5 },
      { index: 2, item: 5, sum: 7 },
      { index: 3, item: 6, sum: 9 },
    ]);
  });
});

describe('props resolver differential — v8 isolate only', () => {
  let resolver: Resolver;
  let executionState: FlowExecutorContext;

  beforeAll(() => {
    mockSandboxHolder.current = v8IsolateCodeSandbox;
    resolver = createPropsResolver({ projectId: 'PROJECT_ID', engineToken: 'WORKER_TOKEN', apiUrl: 'http://127.0.0.1:3000' });
    executionState = buildState();
  });

  test('a token that exhausts the isolate does not change sibling expression tokens', async () => {
    const { resolvedInput } = await resolver.resolve({
      unresolvedInput: {
        a: "{{trigger.name + ''}}",
        b: '{{1 + 1}}',
        c: "{{ (() => { const x = []; for (;;) x.push(new Array(1e6).fill('m')); })() }}",
        d: '{{trigger.items.length * 2}}',
        e: '{{trigger.name}}',
      },
      executionState,
    });
    expect(resolvedInput).toEqual({ a: 'John', b: 2, c: '', d: 6, e: 'John' });
  }, 60_000);

  test('a global set by one token is not visible to another token or a later resolve', async () => {
    const first = await resolver.resolve({
      unresolvedInput: { set: '{{ (globalThis.__leak = 1) }}', read: '{{ typeof __leak }}' },
      executionState,
    });
    expect(first.resolvedInput).toEqual({ set: 1, read: 'undefined' });
    const second = await resolver.resolve({ unresolvedInput: '{{ typeof __leak }}', executionState });
    expect(second.resolvedInput).toEqual('undefined');
  });
});
