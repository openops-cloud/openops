import { ActionType, CODE_BLOCK_NAME } from '@openops/shared';
import { StepDetails } from '../types';
import { getActionName, getBlockName } from './utils';

describe('utils', () => {
  describe('getBlockName', () => {
    const testCases = [
      {
        name: 'returns blockName from settings',
        input: {
          type: ActionType.BLOCK,
          settings: { blockName: 'test-block' },
        },
        expected: 'test-block',
      },
      {
        name: 'returns CODE_BLOCK_NAME for code type',
        input: { type: ActionType.CODE, settings: {} },
        expected: CODE_BLOCK_NAME,
      },
      {
        name: 'returns empty string for non-code without blockName',
        input: { type: ActionType.BLOCK, settings: {} },
        expected: '',
      },
      {
        name: 'handles undefined input',
        input: undefined,
        expected: '',
      },
      {
        name: 'handles null input',
        input: null,
        expected: '',
      },
      {
        name: 'handles undefined settings',
        input: { type: ActionType.BLOCK },
        expected: '',
      },
      {
        name: 'handles empty blockName',
        input: { type: ActionType.BLOCK, settings: { blockName: '' } },
        expected: '',
      },
      {
        name: 'handles null blockName',
        input: { type: ActionType.BLOCK, settings: { blockName: null } },
        expected: '',
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(`${name}`, () => {
        const result = getBlockName(input as StepDetails);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getActionName', () => {
    const testCases = [
      {
        name: 'returns actionName from settings',
        input: {
          type: ActionType.BLOCK,
          settings: { actionName: 'test-action' },
        },
        expected: 'test-action',
      },
      {
        name: 'returns actionName for code type when provided',
        input: {
          type: ActionType.CODE,
          settings: { actionName: 'custom-action' },
        },
        expected: 'custom-action',
      },
      {
        name: 'returns ActionType.CODE for code type without actionName',
        input: { type: ActionType.CODE, settings: {} },
        expected: ActionType.CODE,
      },
      {
        name: 'returns empty string for non-code without actionName',
        input: { type: ActionType.BLOCK, settings: {} },
        expected: '',
      },
      {
        name: 'handles undefined input',
        input: undefined,
        expected: '',
      },
      {
        name: 'handles null input',
        input: null,
        expected: '',
      },
      {
        name: 'handles undefined settings',
        input: { type: ActionType.BLOCK },
        expected: '',
      },
      {
        name: 'handles empty actionName',
        input: { type: ActionType.BLOCK, settings: { actionName: '' } },
        expected: '',
      },
      {
        name: 'handles null actionName',
        input: { type: ActionType.BLOCK, settings: { actionName: null } },
        expected: '',
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(`${name}`, () => {
        const result = getActionName(input as StepDetails);
        expect(result).toBe(expected);
      });
    });
  });
});
