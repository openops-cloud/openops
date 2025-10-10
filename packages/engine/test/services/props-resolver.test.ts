import { FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context';
import { createPropsResolver } from '../../src/lib/variables/props-resolver';
import {
  ActionType,
  GenericStepOutput,
  StepOutputStatus,
  TriggerType,
} from '@openops/shared';

const propsResolver = createPropsResolver({
  projectId: 'PROJECT_ID',
  engineToken: 'WORKER_TOKEN',
  apiUrl: 'http://127.0.0.1:3000',
});

const executionState = FlowExecutorContext.empty()
  .upsertStep(
    'trigger',
    GenericStepOutput.create({
      type: TriggerType.BLOCK,
      status: StepOutputStatus.SUCCEEDED,
      input: {},
      output: {
        items: [5, 'a'],
        name: 'John',
        price: 6.4,
      },
    }),
  )
  .upsertStep('step_1',
    GenericStepOutput.create({

      type: ActionType.BLOCK,
      status: StepOutputStatus.SUCCEEDED,
      input: {},
      output: {
        success: true,
      },
    }))
  .upsertStep('step_2', GenericStepOutput.create({
    type: ActionType.BLOCK,
    status: StepOutputStatus.SUCCEEDED,
    input: {},
    output: 'memory://{"fileName":"hello.png","data":"iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z"}',
  }));


describe('Props Resolver', () => {
  test('Test resolve text with no variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: 'Hello world!', executionState });
    expect(resolvedInput).toEqual(
      'Hello world!',
    );
  });

  test('Test resolve text with double variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: 'Price is {{ trigger.price }}',
      executionState,
    });
    expect(resolvedInput,
    ).toEqual('Price is 6.4');
  });

  test('Test resolve object steps variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{trigger}}', executionState });
    expect(resolvedInput).toEqual(
      {
        items: [5, 'a'],
        name: 'John',
        price: 6.4,
      },
    );
  });

  test('Test resolve steps variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{trigger.name}}', executionState });
    expect(resolvedInput).toEqual(
      'John',
    );
  });

  test('Test resolve multiple variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: '{{trigger.name}} {{trigger.name}}',
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual('John John');
  });

  test('Test resolve variable array items', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput:
        '{{trigger.items[0]}} {{trigger.items[1]}}',
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual('5 a');
  });

  test('Test resolve array variable', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{trigger.items}}', executionState });
    expect(resolvedInput).toEqual(
      [5, 'a'],
    );
  });

  test('Test resolve integer from variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{trigger.items[0]}}', executionState });
    expect(
      resolvedInput,
    ).toEqual(5);
  });

  test('Test resolve text with undefined variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput:
        'test {{configs.bar}} {{trigger.items[4]}}',
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual('test  ');
  });

  test('Test resolve empty text', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '', executionState });
    expect(resolvedInput).toEqual('');
  });


  test('Test resolve empty variable operator', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{}}', executionState });
    expect(resolvedInput).toEqual('');
  });

  test('Test resolve object', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput:
        {
          input: {
            foo: 'bar',
            nums: [1, 2, '{{trigger.items[0]}}'],
            var: '{{trigger.price}}',
          },
        },
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual({ input: { foo: 'bar', nums: [1, 2, 5], var: 6.4 } });
  });

  test('Test resolve boolean from variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({ unresolvedInput: '{{step_1.success}}', executionState });
    expect(resolvedInput).toEqual(
      true,
    );
  });

  test('Test resolve addition from variables', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: '{{trigger.price + 2 - 3}}',
      executionState,
    });
    expect(resolvedInput).toEqual(
      6.4 + 2 - 3,
    );
  });

  test('Test resolve text with array variable', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: 'items are {{trigger.items}}',
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual('items are [5,"a"]');
  });

  test('Test resolve text with object variable', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput:
        'values from trigger step: {{trigger}}',
      executionState,
    });
    expect(
      resolvedInput,
    ).toEqual('values from trigger step: {"items":[5,"a"],"name":"John","price":6.4}');
  });

  test('Test use built-in Math Min function', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: '{{Math.min(trigger.price + 2 - 3, 2)}}',
      executionState,
    });
    expect(resolvedInput).toEqual(
      2,
    );
  });

  test('Test use built-in Math Max function', async () => {
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: '{{Math.max(trigger.price + 2, 2)}}',
      executionState,
    });
    expect(resolvedInput).toEqual(
      8.4,
    );
  });

  it('should not compress memory file in native value in non-logs mode', async () => {
    const input = {
      base64: 'memory://{"fileName":"hello.png","data":"iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z"}',
    };
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: input,
      executionState,
    });
    expect(resolvedInput).toEqual({
      base64: 'memory://{"fileName":"hello.png","data":"iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z"}',
    });
  });

  it('should not compress memory file in referenced value in non-logs mode', async () => {
    const input = {
      base64: '{{step_2}}',
    };
    const { resolvedInput } = await propsResolver.resolve({
      unresolvedInput: input,
      executionState,
    });
    expect(resolvedInput).toEqual({
      base64: 'memory://{"fileName":"hello.png","data":"iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z"}',
    });
  });

  test('Test resolve variable in object key', async () => {
  const { resolvedInput } = await propsResolver.resolve({
    unresolvedInput: {
      '{{trigger.name}}': 'value',
    },
    executionState,
  });
  expect(resolvedInput).toEqual({
    John: 'value',
  });
});

test('Test resolve variables in both key and value', async () => {
  const { resolvedInput } = await propsResolver.resolve({
    unresolvedInput: {
      '{{trigger.name}}': '{{trigger.price}}',
    },
    executionState,
  });
  expect(resolvedInput).toEqual({
    John: 6.4,
  });
});

test('Test resolve variable in nested object key', async () => {
  const { resolvedInput } = await propsResolver.resolve({
    unresolvedInput: {
      outer: {
        '{{trigger.name}}': '{{trigger.items[1]}}',
      },
    },
    executionState,
  });
  expect(resolvedInput).toEqual({
    outer: {
      John: 'a',
    },
  });
});

test('Test resolve variable in array of objects with dynamic keys', async () => {
  const { resolvedInput } = await propsResolver.resolve({
    unresolvedInput: [
      { '{{trigger.name}}': '{{trigger.items[0]}}' },
      { '{{trigger.price}}': '{{trigger.items[1]}}' },
    ],
    executionState,
  });
  expect(resolvedInput).toEqual([
    { John: 5 },
    { 6.4: 'a' },
  ]);
});
});
