import { validateTriggerImport } from '../src/lib/flows/workflow-import-schema';
import { ActionType, BranchOperator } from '../src/lib/flows/actions/action';
import { TriggerType } from '../src/lib/flows/triggers/trigger';
import { BlockType, PackageType } from '../src/lib/blocks/block';

describe('validateTriggerImport', () => {
  // Sample empty trigger with explicit literal values
  const emptyTrigger = {
    name: 'trigger',
    valid: false,
    displayName: 'Select Trigger',
    type: TriggerType.EMPTY,
    settings: {
      inputUiInfo: {}
    },
    nextAction: {
      name: 'step_1',
      type: ActionType.CODE,
      valid: true,
      settings: {
        input: {},
        sourceCode: {
          code: 'export const code = async (inputs) => {\n  return true;\n};',
          packageJson: '{}'
        },
        inputUiInfo: {},
        errorHandlingOptions: {
          retryOnFailure: {
            value: false
          },
          continueOnFailure: {
            value: false
          }
        }
      },
      displayName: 'Code Step'
    }
  };

  // Sample block trigger with explicit literal values
  const blockTrigger = {
    name: 'block-trigger',
    valid: true,
    displayName: 'Block Trigger',
    type: TriggerType.BLOCK,
    settings: {
      blockName: 'test-block',
      blockVersion: '1.0.0',
      blockType: BlockType.OFFICIAL,
      packageType: PackageType.REGISTRY,
      input: {},
      inputUiInfo: {}
    },
    nextAction: {
      name: 'step_1',
      type: ActionType.CODE,
      valid: true,
      settings: {
        input: {},
        sourceCode: {
          code: 'export const code = async (inputs) => {\n  return true;\n};',
          packageJson: '{}'
        },
        inputUiInfo: {},
        errorHandlingOptions: {}
      },
      displayName: 'Code Step'
    }
  };

  test('should validate an empty trigger', () => {
    const result = validateTriggerImport(emptyTrigger);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test('should validate a block trigger', () => {
    const result = validateTriggerImport(blockTrigger);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test('should validate trigger with different action types', () => {
    // Create a trigger with CODE action
    const withCodeAction = {
      ...emptyTrigger,
      nextAction: {
        name: 'code-action',
        type: ActionType.CODE,
        valid: true,
        settings: {
          input: {},
          sourceCode: {
            code: 'export const code = async () => { return true; }',
            packageJson: '{}'
          },
          inputUiInfo: {},
          errorHandlingOptions: {}
        },
        displayName: 'Code Action'
      }
    };

    // Create a trigger with BRANCH action
    const withBranchAction = {
      ...emptyTrigger,
      nextAction: {
        name: 'branch-action',
        type: ActionType.BRANCH,
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: 'test',
                secondValue: 'value',
                caseSensitive: false
              }
            ]
          ],
          inputUiInfo: {}
        },
        displayName: 'Branch Action'
      }
    };

    // Create a trigger with BLOCK action
    const withBlockAction = {
      ...emptyTrigger,
      nextAction: {
        name: 'block-action',
        type: ActionType.BLOCK,
        valid: true,
        settings: {
          blockId: 'block123',
          inputUiInfo: {}
        },
        displayName: 'Block Action'
      }
    };

    expect(validateTriggerImport(withCodeAction).success).toBe(true);
    expect(validateTriggerImport(withBranchAction).success).toBe(true);
    expect(validateTriggerImport(withBlockAction).success).toBe(true);
  });

  test('should validate complex action chains', () => {
    const complexTrigger = {
      ...emptyTrigger,
      nextAction: {
        name: 'branch-action',
        type: ActionType.BRANCH,
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: 'test',
                secondValue: 'value',
                caseSensitive: false
              }
            ]
          ],
          inputUiInfo: {}
        },
        displayName: 'Branch Action',
        onSuccessAction: {
          name: 'loop-action',
          type: ActionType.LOOP_ON_ITEMS,
          valid: true,
          settings: {
            items: '',
            inputUiInfo: {}
          },
          displayName: 'Loop Action',
          firstLoopAction: {
            name: 'code-in-loop',
            type: ActionType.CODE,
            valid: true,
            settings: {
              input: {},
              sourceCode: {
                code: 'export const code = async () => { return true; }',
                packageJson: '{}'
              },
              inputUiInfo: {},
              errorHandlingOptions: {}
            },
            displayName: 'Code In Loop'
          }
        },
        onFailureAction: {
          name: 'code-on-failure',
          type: ActionType.CODE,
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'export const code = async () => { return false; }',
              packageJson: '{}'
            },
            inputUiInfo: {},
            errorHandlingOptions: {}
          },
          displayName: 'Code On Failure'
        }
      }
    };

    expect(validateTriggerImport(complexTrigger).success).toBe(true);
  });

  test('should return errors for missing required fields', () => {
    const noName = { ...emptyTrigger, name: undefined };
    const noType = { ...emptyTrigger, type: undefined };
    const noSettings = { ...emptyTrigger, settings: undefined };
    
    const invalidBlockTrigger = {
      ...blockTrigger, 
      settings: { 
        // Missing required fields for BlockTriggerSettings
        inputUiInfo: {}
      }
    };

    expect(validateTriggerImport(noName as any).success).toBe(false);
    expect(validateTriggerImport(noType as any).success).toBe(false);
    expect(validateTriggerImport(noSettings as any).success).toBe(false);
    expect(validateTriggerImport(invalidBlockTrigger as any).success).toBe(false);
  });

  test('should return detailed error messages', () => {
    const invalidTrigger = { 
      name: 'test',
      type: 'INVALID_TYPE' 
    };
    
    const result = validateTriggerImport(invalidTrigger as any);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    
    // Check that error messages are formatted as expected
    result.errors!.forEach(error => {
      expect(error).toMatch(/^(\/[^:]+)?: .+$/);
    });
  });

  test('should handle errors in nextAction validation', () => {
    const triggerWithInvalidAction = {
      ...emptyTrigger,
      nextAction: {
        name: 'invalid-action',
        type: 'INVALID_TYPE', // Invalid action type
        settings: {}
      }
    };
    
    const result = validateTriggerImport(triggerWithInvalidAction as any);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('should handle exceptions during validation', () => {
    // Create a circular reference to cause an exception
    const circularTrigger: any = {
      name: 'circular',
      type: TriggerType.EMPTY,
      settings: {}
    };
    circularTrigger.circular = circularTrigger;
    
    const result = validateTriggerImport(circularTrigger);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(1);
  });
});