import { Action } from '../actions/action';
import { flowHelper } from '../flow-helper';

describe('flowHelper', () => {
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
