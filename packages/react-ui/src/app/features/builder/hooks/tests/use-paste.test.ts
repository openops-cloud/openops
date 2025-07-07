import {
  Action,
  ActionType,
  BranchAction,
  BranchOperator,
  CodeAction,
  LoopOnItemsAction,
  openOpsId,
  SplitAction,
} from '@openops/shared';
import { assignNewIdsToActions } from '../use-paste';

// Mock the openOpsId function to generate predictable IDs for testing
jest.mock('@openops/shared', () => {
  const actual = jest.requireActual('@openops/shared');
  let idCounter = 0;
  return {
    ...actual,
    openOpsId: jest.fn(() => `test-id-${++idCounter}`),
  };
});

describe('assignNewIdsToActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the counter for openOpsId mock
    let idCounter = 0;
    (openOpsId as jest.Mock).mockImplementation(() => `test-id-${++idCounter}`);
  });

  // Helper function to create a basic CodeAction
  const createCodeAction = (
    overrides: Partial<CodeAction> = {},
  ): CodeAction => ({
    id: 'default-id',
    name: 'default-step',
    displayName: 'Default Step',
    type: ActionType.CODE,
    valid: true,
    settings: {
      sourceCode: { code: 'console.log("test")', packageJson: '{}' },
      input: {},
      inputUiInfo: {},
      errorHandlingOptions: {},
    },
    ...overrides,
  });

  const expectBasicIdAssignment = (result: Action, original: Action) => {
    expect(result.id).toBe('test-id-1');
    expect(result.id).not.toBe(original.id);
    expect(result.name).toBe(original.name);
    expect(result.displayName).toBe(original.displayName);
    expect(result.type).toBe(original.type);
  };

  describe('Single Actions', () => {
    it.each([
      {
        actionType: 'CODE',
        action: (): CodeAction => ({
          id: 'code-id',
          name: 'code-step',
          displayName: 'Code Step',
          type: ActionType.CODE,
          valid: true,
          settings: {
            sourceCode: { code: 'console.log("test")', packageJson: '{}' },
            input: {},
            inputUiInfo: {},
            errorHandlingOptions: {},
          },
        }),
      },
      {
        actionType: 'BLOCK',
        action: (): Action => ({
          id: 'block-id',
          name: 'block-step',
          displayName: 'Block Step',
          type: ActionType.BLOCK,
          valid: true,
          settings: {
            packageType: 'REGISTRY' as any,
            blockType: 'OFFICIAL' as any,
            blockName: '@openops/block-webhook',
            blockVersion: '1.0.0',
            actionName: 'send',
            input: { url: 'https://example.com' },
            inputUiInfo: {},
            errorHandlingOptions: {},
          },
        }),
      },
    ])(
      'should assign a new ID to a $actionType action',
      ({ action, actionType }) => {
        const originalAction = action();
        const result = assignNewIdsToActions(originalAction);

        expectBasicIdAssignment(result, originalAction);
        expect(result.settings).toEqual(originalAction.settings);
      },
    );
  });

  describe('Chain Length Tests', () => {
    it.each([
      { chainLength: 1, description: 'single action' },
      { chainLength: 2, description: 'two actions' },
      { chainLength: 3, description: 'three actions' },
      { chainLength: 5, description: 'five actions' },
    ])(
      'should assign new IDs to a chain of $chainLength actions',
      ({ chainLength }) => {
        // Build a chain of actions
        let currentAction: CodeAction | undefined;
        const originalActions: CodeAction[] = [];

        for (let i = chainLength; i >= 1; i--) {
          const action = createCodeAction({
            id: `action-${i}-id`,
            name: `action-${i}`,
            displayName: `Action ${i}`,
            nextAction: currentAction,
          });
          originalActions.unshift(action);
          currentAction = action;
        }

        const rootAction = originalActions[0];
        const result = assignNewIdsToActions(rootAction);

        // Verify IDs are assigned in order
        let current: Action | undefined = result;
        for (let i = 1; i <= chainLength; i++) {
          expect(current?.id).toBe(`test-id-${i}`);
          expect(current?.id).not.toBe(originalActions[i - 1].id);
          current = current?.nextAction;
        }
      },
    );
  });

  describe('Empty/Undefined Nested Actions', () => {
    it.each([
      {
        actionType: 'BRANCH with no nested actions',
        createAction: (): BranchAction => ({
          id: 'empty-branch-id',
          name: 'empty-branch',
          displayName: 'Empty Branch',
          type: ActionType.BRANCH,
          valid: true,
          settings: { conditions: [[]], inputUiInfo: {} },
          onSuccessAction: undefined,
          onFailureAction: undefined,
        }),
        expectations: (result: BranchAction) => {
          expect((result as BranchAction).onSuccessAction).toBeUndefined();
          expect((result as BranchAction).onFailureAction).toBeUndefined();
        },
      },
      {
        actionType: 'LOOP with no firstLoopAction',
        createAction: (): LoopOnItemsAction => ({
          id: 'empty-loop-id',
          name: 'empty-loop',
          displayName: 'Empty Loop',
          type: ActionType.LOOP_ON_ITEMS,
          valid: true,
          settings: { items: '{{trigger.body.items}}', inputUiInfo: {} },
        }),
        expectations: (result: LoopOnItemsAction) => {
          expect((result as LoopOnItemsAction).firstLoopAction).toBeUndefined();
        },
      },
      {
        actionType: 'SPLIT with empty branches',
        createAction: (): SplitAction => ({
          id: 'empty-split-id',
          name: 'empty-split',
          displayName: 'Empty Split',
          type: ActionType.SPLIT,
          valid: true,
          settings: { options: [], inputUiInfo: {}, defaultBranch: 'default' },
          branches: [],
        }),
        expectations: (result: SplitAction) => {
          expect((result as SplitAction).branches).toEqual([]);
        },
      },
    ])('should handle $actionType', ({ createAction, expectations }) => {
      const originalAction = createAction();
      const result = assignNewIdsToActions(originalAction);

      expectBasicIdAssignment(result, originalAction);
      expectations(result as any);
    });
  });

  describe('Property Preservation', () => {
    it.each([
      {
        description: 'complex settings object',
        action: createCodeAction({
          id: 'complex-id',
          valid: false,
          settings: {
            sourceCode: {
              code: 'complex code',
              packageJson: '{"dependencies": {"lodash": "^4.0.0"}}',
            },
            input: {
              customParam: 'value',
              nested: { deep: true, array: [1, 2, 3] },
            },
            inputUiInfo: { sampleData: { test: 'data' } },
            errorHandlingOptions: {
              continueOnFailure: { value: true },
              retryOnFailure: { value: false },
            },
          },
        }),
      },
      {
        description: 'minimal valid action',
        action: createCodeAction({
          id: 'minimal-id',
          name: 'minimal',
          displayName: 'Minimal',
        }),
      },
    ])('should preserve $description', ({ action }) => {
      const result = assignNewIdsToActions(action);

      expect(result.id).toBe('test-id-1');
      expect(result.id).not.toBe(action.id);
      expect(result.name).toBe(action.name);
      expect(result.displayName).toBe(action.displayName);
      expect(result.type).toBe(action.type);
      expect(result.valid).toBe(action.valid);
      expect(result.settings).toEqual(action.settings);
    });
  });

  describe('Immutability', () => {
    it.each([
      { description: 'single action', hasNested: false },
      { description: 'action with nested action', hasNested: true },
    ])('should not modify original $description', ({ hasNested }) => {
      const nestedAction = hasNested
        ? createCodeAction({
            id: 'nested-id',
            name: 'nested',
          })
        : undefined;

      const originalAction = createCodeAction({
        id: 'original-id',
        name: 'original',
        nextAction: nestedAction,
      });

      const originalId = originalAction.id;
      const originalNestedId = nestedAction?.id;

      const result = assignNewIdsToActions(originalAction);

      // Original objects unchanged
      expect(originalAction.id).toBe(originalId);
      if (hasNested) {
        expect(nestedAction?.id).toBe(originalNestedId);
      }

      // Result has new IDs
      expect(result.id).toBe('test-id-1');
      if (hasNested) {
        expect(result.nextAction?.id).toBe('test-id-2');
      }

      // Different object references
      expect(result).not.toBe(originalAction);
      if (hasNested) {
        expect(result.nextAction).not.toBe(nestedAction);
      }
    });
  });

  describe('Complex Nested Scenarios', () => {
    it('should handle deeply nested actions with multiple types', () => {
      const splitBranchAction = createCodeAction({
        id: 'split-branch-code-id',
        name: 'split-branch-code',
        displayName: 'Split Branch Code',
      });

      const splitAfterLoop: SplitAction = {
        id: 'split-after-loop-id',
        name: 'split-after-loop',
        displayName: 'Split After Loop',
        type: ActionType.SPLIT,
        valid: true,
        settings: {
          options: [
            { id: 'split-option', name: 'Split Option', conditions: [[]] },
          ],
          inputUiInfo: {},
          defaultBranch: 'split-option',
        },
        branches: [{ optionId: 'split-option', nextAction: splitBranchAction }],
      };

      const codeInLoop = createCodeAction({
        id: 'code-in-loop-id',
        name: 'code-in-loop',
        displayName: 'Code In Loop',
        nextAction: splitAfterLoop,
      });

      const loopInBranch: LoopOnItemsAction = {
        id: 'loop-in-branch-id',
        name: 'loop-in-branch',
        displayName: 'Loop In Branch',
        type: ActionType.LOOP_ON_ITEMS,
        valid: true,
        settings: {
          items: '{{trigger.body.items}}',
          inputUiInfo: {},
        },
        firstLoopAction: codeInLoop,
      };

      const failureCode = createCodeAction({
        id: 'failure-code-id',
        name: 'failure-code',
        displayName: 'Failure Code',
      });

      const rootBranch: BranchAction = {
        id: 'root-branch-id',
        name: 'root-branch',
        displayName: 'Root Branch',
        type: ActionType.BRANCH,
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: BranchOperator.BOOLEAN_IS_TRUE,
                firstValue: '{{trigger.body.condition}}',
              },
            ],
          ],
          inputUiInfo: {},
        },
        onSuccessAction: loopInBranch,
        onFailureAction: failureCode,
      };

      const result = assignNewIdsToActions(rootBranch) as BranchAction;

      // Verify depth-first ID assignment
      expect(result.id).toBe('test-id-1');
      expect(result.onSuccessAction?.id).toBe('test-id-2');
      expect(
        (result.onSuccessAction as LoopOnItemsAction)?.firstLoopAction?.id,
      ).toBe('test-id-3');
      expect(
        (result.onSuccessAction as LoopOnItemsAction)?.firstLoopAction
          ?.nextAction?.id,
      ).toBe('test-id-4');
      expect(
        (
          (result.onSuccessAction as LoopOnItemsAction)?.firstLoopAction
            ?.nextAction as SplitAction
        )?.branches[0].nextAction?.id,
      ).toBe('test-id-5');
      expect(result.onFailureAction?.id).toBe('test-id-6');

      // Verify structure preservation
      expect(result.type).toBe(ActionType.BRANCH);
      expect(result.onSuccessAction?.type).toBe(ActionType.LOOP_ON_ITEMS);
      expect(result.onFailureAction?.type).toBe(ActionType.CODE);
    });
  });
});
