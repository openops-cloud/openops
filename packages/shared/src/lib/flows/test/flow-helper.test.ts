import { Action } from '../actions/action';
import { flowHelper } from '../flow-helper';

describe('flowHelper', () => {
  describe('indexToAlphabetical', () => {
    it('should convert boundary and multi-letter indices correctly', () => {
      expect(flowHelper.indexToAlphabetical(0)).toBe('a');
      expect(flowHelper.indexToAlphabetical(25)).toBe('z');
      expect(flowHelper.indexToAlphabetical(26)).toBe('aa');
      expect(flowHelper.indexToAlphabetical(27)).toBe('ab');
      expect(flowHelper.indexToAlphabetical(51)).toBe('az');
      expect(flowHelper.indexToAlphabetical(52)).toBe('ba');
      expect(flowHelper.indexToAlphabetical(701)).toBe('zz');
      expect(flowHelper.indexToAlphabetical(702)).toBe('aaa');
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
