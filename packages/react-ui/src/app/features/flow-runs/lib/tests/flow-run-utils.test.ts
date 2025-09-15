import { ActionType, StepOutput } from '@openops/shared';
import { flowRunUtils, shouldHideRunActions } from '../flow-run-utils';

describe('flowRunUtils.extractStepOutput', () => {
  const trigger = {
    name: 'trigger',
    type: 'TRIGGER',
    nextAction: {
      name: 'loop1',
      type: ActionType.LOOP_ON_ITEMS,
      firstLoopAction: {
        name: 'loop2',
        type: ActionType.LOOP_ON_ITEMS,
        firstLoopAction: {
          name: 'child',
          type: ActionType.CODE,
        },
      },
    },
  };

  const loopIndexes = {
    loop1: 0,
    loop2: 1,
  };

  const output = {
    loop1: {
      output: {
        iterations: [
          {
            loop2: {
              output: {
                iterations: [
                  { child: { value: 'a' } },
                  { child: { value: 'b' } },
                ],
              },
            },
          },
        ],
      },
    },
  };

  it('returns direct output if present', () => {
    const directOutput = { value: 'direct-result' } as unknown as StepOutput;
    const result = flowRunUtils.extractStepOutput(
      'someStep',
      {},
      { someStep: directOutput },
      trigger as any,
    );
    expect(result).toEqual(directOutput);
  });

  it('returns nested loop child output', () => {
    const result = flowRunUtils.extractStepOutput(
      'child',
      loopIndexes,
      output as any,
      trigger as any,
    );
    expect(result).toEqual({ value: 'b' });
  });

  it('returns undefined if loop index is out of bounds', () => {
    const badIndexes = { loop1: 5, loop2: 0 };
    const result = flowRunUtils.extractStepOutput(
      'child',
      badIndexes,
      output as any,
      trigger as any,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined if no parents are found', () => {
    const unrelatedTrigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: undefined,
    };
    const result = flowRunUtils.extractStepOutput(
      'missingStep',
      {},
      {},
      unrelatedTrigger as any,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined from BRANCH onSuccessAction path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'branch',
        type: ActionType.BRANCH,
        onSuccessAction: {
          name: 'stepInSuccessPath',
          type: ActionType.CODE,
        },
      },
    };

    const output = {
      branch: {
        output: {},
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInSuccessPath',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual(undefined);
  });

  it('returns undefined from BRANCH onFailureAction path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'branch',
        type: ActionType.BRANCH,
        onFailureAction: {
          name: 'stepInFailurePath',
          type: ActionType.CODE,
        },
      },
    };

    const output = {
      branch: {
        output: {},
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInFailurePath',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual(undefined);
  });

  it('returns undefined from SPLIT branch path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'split',
        type: ActionType.SPLIT,
        branches: [
          {
            name: 'branch1',
            nextAction: {
              name: 'stepInBranch1',
              type: ActionType.CODE,
            },
          },
          {
            name: 'branch2',
            nextAction: {
              name: 'stepInBranch2',
              type: ActionType.CODE,
            },
          },
        ],
      },
    };

    const output = {
      split: {
        output: {},
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInBranch2',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual(undefined);
  });
  it('extracts output from BRANCH onSuccessAction path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'branch',
        type: ActionType.BRANCH,
        onSuccessAction: {
          name: 'stepInSuccessPath',
          type: ActionType.CODE,
        },
      },
    };

    const output = {
      branch: {
        output: {},
      },
      stepInSuccessPath: {
        value: 'success-path-output',
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInSuccessPath',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual({ value: 'success-path-output' });
  });

  it('extracts outputfrom BRANCH onFailureAction path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'branch',
        type: ActionType.BRANCH,
        onFailureAction: {
          name: 'stepInFailurePath',
          type: ActionType.CODE,
        },
      },
    };

    const output = {
      branch: {
        output: {},
      },
      stepInFailurePath: {
        value: 'failure-path-output',
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInFailurePath',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual({ value: 'failure-path-output' });
  });

  it('extracts output from SPLIT branch path', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'split',
        type: ActionType.SPLIT,
        branches: [
          {
            name: 'branch1',
            nextAction: {
              name: 'stepInBranch1',
              type: ActionType.CODE,
            },
          },
          {
            name: 'branch2',
            nextAction: {
              name: 'stepInBranch2',
              type: ActionType.CODE,
            },
          },
        ],
      },
    };

    const output = {
      split: {
        output: {},
      },
      stepInBranch2: {
        value: 'split-branch2-output',
      },
    };

    const result = flowRunUtils.extractStepOutput(
      'stepInBranch2',
      {},
      output as any,
      trigger as any,
    );
    expect(result).toEqual({ value: 'split-branch2-output' });
  });
});
describe('flowRunUtils.findFailedStep', () => {
  it('returns the failed step info at the top level', () => {
    const run = {
      steps: {
        step1: { status: 'SUCCEEDED' },
        step2: { status: 'FAILED' },
        step3: { status: 'SUCCEEDED' },
      },
    } as any;
    const result = flowRunUtils.findFailedStep(run);
    expect(result).toEqual({ stepName: 'step2', loopIndexes: {} });
  });

  it('returns the failed step info inside a loop', () => {
    const run = {
      steps: {
        loop1: {
          type: ActionType.LOOP_ON_ITEMS,
          output: {
            iterations: [
              {
                child: { status: 'SUCCEEDED' },
              },
              {
                child: { status: 'FAILED' },
              },
            ],
          },
        },
      },
    } as any;
    const result = flowRunUtils.findFailedStep(run);
    expect(result).toEqual({ stepName: 'child', loopIndexes: { loop1: 1 } });
  });

  it('returns the failed step info inside nested loops', () => {
    const run = {
      steps: {
        loop1: {
          type: ActionType.LOOP_ON_ITEMS,
          output: {
            iterations: [
              {
                loop2: {
                  type: ActionType.LOOP_ON_ITEMS,
                  output: {
                    iterations: [
                      { child: { status: 'SUCCEEDED' } },
                      { child: { status: 'FAILED' } },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    } as any;
    const result = flowRunUtils.findFailedStep(run);
    expect(result).toEqual({
      stepName: 'child',
      loopIndexes: { loop1: 0, loop2: 1 },
    });
  });

  it('returns null if there are no failed steps', () => {
    const run = {
      steps: {
        step1: { status: 'SUCCEEDED' },
        step2: { status: 'SUCCEEDED' },
      },
    } as any;
    expect(flowRunUtils.findFailedStep(run)).toBeNull();
  });
});

describe('flowRunUtils.findLoopsState', () => {
  const trigger = {
    name: 'trigger',
    type: 'TRIGGER',
    nextAction: {
      name: 'loop1',
      type: ActionType.LOOP_ON_ITEMS,
      firstLoopAction: {
        name: 'step1',
        type: ActionType.CODE,
      },
    },
  };

  const flowVersion = { trigger } as any;

  it('returns currentLoopsState if no failed step', () => {
    const run = { steps: {} } as any;
    const currentLoopsState = { loop1: 2 };
    const result = flowRunUtils.findLoopsState(
      flowVersion,
      run,
      currentLoopsState,
    );
    expect(result).toEqual({ loop1: 2 });
  });

  it('returns failed loop indexes if failed step is child of loop', () => {
    const run = {
      steps: {
        loop1: {
          type: ActionType.LOOP_ON_ITEMS,
          output: {
            iterations: [
              { step1: { status: 'SUCCEEDED' } },
              { step1: { status: 'FAILED' } },
            ],
          },
        },
      },
    } as any;
    const currentLoopsState = { loop1: 1 };
    const result = flowRunUtils.findLoopsState(
      flowVersion,
      run,
      currentLoopsState,
    );
    expect(result).toEqual({ loop1: 1 });
  });

  it('returns failed loop indexes for nested loops', () => {
    const trigger = {
      name: 'trigger',
      type: 'TRIGGER',
      nextAction: {
        name: 'loop1',
        type: ActionType.LOOP_ON_ITEMS,
        firstLoopAction: {
          name: 'loop2',
          type: ActionType.LOOP_ON_ITEMS,
          firstLoopAction: {
            name: 'step1',
            type: ActionType.CODE,
          },
        },
      },
    };
    const flowVersion = { trigger } as any;
    const run = {
      steps: {
        loop1: {
          type: ActionType.LOOP_ON_ITEMS,
          output: {
            iterations: [
              {
                loop2: {
                  type: ActionType.LOOP_ON_ITEMS,
                  output: {
                    iterations: [
                      { step1: { status: 'SUCCEEDED' } },
                      { step1: { status: 'FAILED' } },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    } as any;
    const currentLoopsState = { loop1: 0, loop2: 1 };
    const result = flowRunUtils.findLoopsState(
      flowVersion,
      run,
      currentLoopsState,
    );
    expect(result).toEqual({ loop1: 0, loop2: 1 });
  });

  it('returns currentLoopsState if the failed step is the parent loop itself', () => {
    const run = {
      steps: {
        loop1: {
          type: ActionType.LOOP_ON_ITEMS,
          status: 'FAILED',
          output: {
            iterations: [
              { step1: { status: 'SUCCEEDED' } },
              { step1: { status: 'SUCCEEDED' } },
            ],
          },
        },
      },
    } as any;
    const currentLoopsState = { loop1: 1 };
    const result = flowRunUtils.findLoopsState(
      flowVersion,
      run,
      currentLoopsState,
    );
    expect(result).toEqual({ loop1: 1 });
  });
});

describe('flowRunUtils.extractLoopItemStepOutput', () => {
  const trigger = {
    name: 'trigger',
    type: 'TRIGGER',
    nextAction: {
      name: 'loopStep',
      type: ActionType.LOOP_ON_ITEMS,
      firstLoopAction: {
        name: 'childStep',
        type: ActionType.CODE,
      },
    },
  };

  it('processes loop item output correctly', () => {
    const loopIndexes = { loopStep: 0 };
    const output = {
      loopStep: {
        type: ActionType.LOOP_ON_ITEMS,
        input: { items: ['item0', 'item1', 'item2'] },
        output: { index: 1 },
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'loopStep',
      loopIndexes,
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.LOOP_ON_ITEMS,
      input: { items: ['item0', 'item1', 'item2'] },
      output: {
        item: 'item0',
        index: 1,
      },
    });
  });

  it('processes loop item output correctly 123', () => {
    const loopIndexes = { loopStep: 2 };
    const output = {
      loopStep: {
        type: ActionType.LOOP_ON_ITEMS,
        input: { items: ['item0', 'item1', 'item2'] },
        output: { index: 3 },
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'loopStep',
      loopIndexes,
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.LOOP_ON_ITEMS,
      input: { items: ['item0', 'item1', 'item2'] },
      output: {
        item: 'item2',
        index: 3,
      },
    });
  });

  it('returns original output when step is not a loop', () => {
    const output = {
      nonLoopStep: {
        type: ActionType.CODE,
        input: { data: 'test' },
        output: { result: 'success' },
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'nonLoopStep',
      {},
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.CODE,
      input: { data: 'test' },
      output: { result: 'success' },
    });
  });

  it('returns original output when loop step has no output index', () => {
    const output = {
      loopStep: {
        type: ActionType.LOOP_ON_ITEMS,
        input: { items: ['item0', 'item1'] },
        output: {},
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'loopStep',
      { loopStep: 0 },
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.LOOP_ON_ITEMS,
      input: { items: ['item0', 'item1'] },
      output: {},
    });
  });

  it('returns original output when loop step has no input', () => {
    const output = {
      loopStep: {
        type: ActionType.LOOP_ON_ITEMS,
        output: { index: 1 },
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'loopStep',
      { loopStep: 0 },
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.LOOP_ON_ITEMS,
      output: { index: 1 },
    });
  });

  it('returns original output when an error occurs', () => {
    const loopIndexes = { loopStep: 5 };
    const output = {
      loopStep: {
        type: ActionType.LOOP_ON_ITEMS,
        input: { items: 123 },
        output: { index: 6 },
      },
    };

    const result = flowRunUtils.extractLoopItemStepOutput(
      'loopStep',
      loopIndexes,
      output as any,
      trigger as any,
    );

    expect(result).toEqual({
      type: ActionType.LOOP_ON_ITEMS,
      input: { items: 123 },
      output: { index: 6 },
    });
  });
});

const params = (
  overrides: Partial<Parameters<typeof shouldHideRunActions>[0]> = {},
) => ({
  isFailed: false,
  isRunning: false,
  isSuccessfulRun: false,
  isStopped: false,
  isTestRun: false,
  ...overrides,
});

describe('shouldHideRunActions', () => {
  it('hides actions for failed test runs', () => {
    expect(
      shouldHideRunActions(params({ isFailed: true, isTestRun: true })),
    ).toBe(true);
  });

  it('hides actions for stopped test runs', () => {
    expect(
      shouldHideRunActions(params({ isStopped: true, isTestRun: true })),
    ).toBe(true);
  });

  it('shows actions for failed non-test runs (allow retry)', () => {
    expect(
      shouldHideRunActions(params({ isFailed: true, isTestRun: false })),
    ).toBe(false);
  });

  it('shows actions for stopped non-test runs (allow retry)', () => {
    expect(
      shouldHideRunActions(params({ isStopped: true, isTestRun: false })),
    ).toBe(false);
  });

  it('shows actions for running test runs (allow stop)', () => {
    expect(
      shouldHideRunActions(params({ isRunning: true, isTestRun: true })),
    ).toBe(false);
  });

  it('shows actions for successful runs (allow rerun), regardless of test flag', () => {
    expect(
      shouldHideRunActions(params({ isSuccessfulRun: true, isTestRun: false })),
    ).toBe(false);

    expect(
      shouldHideRunActions(params({ isSuccessfulRun: true, isTestRun: true })),
    ).toBe(false);
  });

  it('hides actions when no known state flags are set (e.g., pending/queued)', () => {
    expect(
      shouldHideRunActions(
        params({
          isFailed: false,
          isRunning: false,
          isSuccessfulRun: false,
          isStopped: false,
          isTestRun: false,
        }),
      ),
    ).toBe(true);
  });
});
