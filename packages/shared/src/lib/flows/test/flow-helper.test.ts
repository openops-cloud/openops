import { Action } from '../actions/action';
import { flowHelper } from '../flow-helper';

describe('flowHelper', () => {
  describe('indexToAlphabetical', () => {
    it.each<[number, string]>([
      [0, 'a'],
      [25, 'z'],
      [26, 'aa'],
      [27, 'ab'],
      [51, 'az'],
      [52, 'ba'],
      [701, 'zz'],
      [702, 'aaa'],
    ])('converts %d to %s', (input, expected) => {
      expect(flowHelper.indexToAlphabetical(input)).toBe(expected);
    });
  });

  describe('findUnusedName', () => {
    it('should return the first alphabetical suffix when none exist', () => {
      const names: string[] = [];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_a');
    });

    it('should fill the first gap in the existing names', () => {
      const names = ['step_a', 'step_b', 'step_d'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_c');
    });

    it('should skip unrelated names and prefixes', () => {
      const names = ['step_a', 'other_a', 'step_b'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_c');
    });

    it('should roll over to double letters after z', () => {
      const names = Array.from(
        { length: 26 },
        (_, i) => `step_${flowHelper.indexToAlphabetical(i)}`,
      );
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_aa');
    });

    it('should work with larger gaps and mixed ordering', () => {
      const names = ['step_aa', 'step_c', 'step_a', 'step_ab'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_b');
    });
  });

  describe('truncateFlow', () => {
    it("should return the same step if it's already the last step", () => {
      const step = { name: 'A', nextAction: undefined } as Action;
      expect(flowHelper.truncateFlow(step, 'A')).toEqual({
        name: 'A',
        nextAction: undefined,
      });
    });

    it('should remove nextAction if lastStepName is found in the chain', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'B')).toEqual({
        name: 'A',
        nextAction: { name: 'B', nextAction: undefined },
      });
    });

    it('should not modify the chain if lastStepName does not exist', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'D')).toEqual({
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      });
    });

    it('should work with a longer chain', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: {
            name: 'C',
            nextAction: {
              name: 'D',
              nextAction: { name: 'E', nextAction: undefined },
            },
          },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'C')).toEqual({
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: {
            name: 'C',
            nextAction: undefined,
          },
        },
      });
    });
  });
});
