import { ActionType, StepOutput } from '@openops/shared';
import { flowRunUtils } from '../flow-run-utils';

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
    expect(result).toEqual({ value: 'b' }); // loop2[1] -> child
  });

  it('returns undefined if loop index is out of bounds', () => {
    const badIndexes = { loop1: 5, loop2: 0 }; // loop1 has only 1 iteration
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
