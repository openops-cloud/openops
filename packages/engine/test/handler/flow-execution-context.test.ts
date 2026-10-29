import { ActionType, GenericStepOutput, StepOutput, StepOutputStatus, TriggerType } from '@openops/shared';
import { FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context';

const step = (type: ActionType | TriggerType, output: unknown): StepOutput =>
  GenericStepOutput.create({ type, status: StepOutputStatus.SUCCEEDED, input: {}, output }) as unknown as StepOutput;

/**
 * trigger, outer (output undefined), loop with two iterations; iteration 1 shadows `outer` with
 * `output: undefined` and defines `inner`.
 */
const buildContext = () => {
  const iterations = [
    { inner: step(ActionType.BLOCK, { v: 'it0' }) },
    { inner: step(ActionType.BLOCK, { v: 'it1' }), outer: step(ActionType.BLOCK, undefined) },
  ];
  return FlowExecutorContext.empty()
    .upsertStep('trigger', step(TriggerType.BLOCK, { name: 'John' }))
    .upsertStep('outer', step(ActionType.BLOCK, { v: 'outer' }))
    .upsertStep('loop', step(ActionType.LOOP_ON_ITEMS, { item: 'b', index: 2, iterations }));
};

describe('FlowExecutorContext.stepNames', () => {
  test('returns the root step names outside a loop', () => {
    expect(buildContext().stepNames()).toEqual(['trigger', 'outer', 'loop']);
  });

  test('returns the union of root and iteration step names inside a loop', () => {
    const context = buildContext().setCurrentPath(
      buildContext().currentPath.loopIteration({ loopName: 'loop', iteration: 0 }),
    );
    expect(context.stepNames()).toEqual(['trigger', 'outer', 'loop', 'inner']);
  });

  test('matches the keys of currentState()', () => {
    const context = buildContext().setCurrentPath(
      buildContext().currentPath.loopIteration({ loopName: 'loop', iteration: 1 }),
    );
    expect(context.stepNames().sort()).toEqual(Object.keys(context.currentState()).sort());
  });

  test('throws the same error as currentState() for a path through a non-loop step', () => {
    const context = buildContext().setCurrentPath(
      buildContext().currentPath.loopIteration({ loopName: 'outer', iteration: 0 }),
    );
    expect(() => context.stepNames()).toThrow('Not instance of Loop On Items step output');
    expect(() => context.currentState()).toThrow('Not instance of Loop On Items step output');
  });
});

describe('FlowExecutorContext.getStepOutputView', () => {
  test('returns the live output of a root step', () => {
    const context = buildContext();
    expect(context.getStepOutputView('trigger')).toEqual({ name: 'John' });
    expect(context.getStepOutputView('trigger')).toBe(context.steps['trigger'].output);
  });

  test('returns undefined for an unknown step and for prototype properties', () => {
    const context = buildContext();
    expect(context.getStepOutputView('nope')).toBeUndefined();
    expect(context.getStepOutputView('toString')).toBeUndefined();
    expect(context.getStepOutputView('__proto__')).toBeUndefined();
  });

  test('iteration steps shadow root steps, innermost first', () => {
    const it0 = buildContext().setCurrentPath(
      buildContext().currentPath.loopIteration({ loopName: 'loop', iteration: 0 }),
    );
    expect(it0.getStepOutputView('inner')).toEqual({ v: 'it0' });
    expect(it0.getStepOutputView('outer')).toEqual({ v: 'outer' });

    const it1 = buildContext().setCurrentPath(
      buildContext().currentPath.loopIteration({ loopName: 'loop', iteration: 1 }),
    );
    expect(it1.getStepOutputView('inner')).toEqual({ v: 'it1' });
    // present in the iteration with output undefined → shadows the root value, as currentState() does
    expect(it1.getStepOutputView('outer')).toBeUndefined();
    expect(it1.currentState()['outer']).toBeUndefined();
  });

  test('inner steps are not visible outside the loop', () => {
    expect(buildContext().getStepOutputView('inner')).toBeUndefined();
  });

  test('reads the loop step output as currently upserted, from inside an iteration', () => {
    const root = buildContext();
    const path = root.currentPath.loopIteration({ loopName: 'loop', iteration: 0 });
    expect(root.setCurrentPath(path).getStepOutputView('loop')).toMatchObject({ item: 'b', index: 2 });

    const iterations = (root.steps['loop'].output as { iterations: unknown[] }).iterations;
    const updated = root
      .upsertStep('loop', step(ActionType.LOOP_ON_ITEMS, { item: 'c', index: 3, iterations }))
      .setCurrentPath(path);
    expect(updated.getStepOutputView('loop')).toMatchObject({ item: 'c', index: 3 });
    expect(updated.getStepOutputView('inner')).toEqual({ v: 'it0' });
  });
});
