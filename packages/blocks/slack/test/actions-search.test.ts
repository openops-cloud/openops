import { getMessageInteractiveElements } from '../src/lib/common/actions-search';

describe('getMessageInteractiveElements', () => {
  test.each([
    [[] as any[]],
    [
      [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'This is a plain text section block.',
            emoji: true,
          },
        },
      ],
    ],
  ])(
    'should return empty when there are no interactive elements in the message %p',
    (blocks: any[]) => {
      const result = getMessageInteractiveElements(blocks);
      expect(result).toEqual([]);
    },
  );

  test('should return list of interactive elements found', () => {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'This is a plain text section block.',
          emoji: true,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Click Me 1', emoji: true },
            value: 'click_me_123',
            action_id: 'actionId-0',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'This is a section block with a button.',
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Click Me 2', emoji: true },
          value: 'click_me_123',
          action_id: 'button-action',
        },
      },
    ];

    const result = getMessageInteractiveElements(blocks);

    expect(result.length).toEqual(2);
    expect(result[0]).toStrictEqual({
      label: 'Click Me 1',
      value: 'Click Me 1',
    });
    expect(result[1]).toStrictEqual({
      label: 'Click Me 2',
      value: 'Click Me 2',
    });
  });
});
