import { isFollowUpAction } from '../../../src/app/slack/is-follow-up-action';

describe('isFollowUpAction', () => {
  test('should return true when the selected value is listed in followUpActions', () => {
    const result = isFollowUpAction(
      { value: "I'm not the owner", displayText: "I'm not the owner" },
      ["I'm not the owner"],
    );

    expect(result).toBe(true);
  });

  test('should return false when the selected value is not listed', () => {
    const result = isFollowUpAction(
      { value: 'Approve', displayText: 'Approve' },
      ["I'm not the owner"],
    );

    expect(result).toBe(false);
  });

  test.each([undefined, null, 'not-an-array', 42, {}])(
    'should return false when followUpActions is %p',
    (followUpActions) => {
      const result = isFollowUpAction(
        { value: "I'm not the owner", displayText: "I'm not the owner" },
        followUpActions,
      );

      expect(result).toBe(false);
    },
  );

  test('should return false when followUpActions is an empty array', () => {
    const result = isFollowUpAction(
      { value: "I'm not the owner", displayText: "I'm not the owner" },
      [],
    );

    expect(result).toBe(false);
  });

  test('should return false for multi-select selections', () => {
    const result = isFollowUpAction(
      [
        { value: "I'm not the owner", displayText: "I'm not the owner" },
        { value: 'Approve', displayText: 'Approve' },
      ],
      ["I'm not the owner"],
    );

    expect(result).toBe(false);
  });
});
