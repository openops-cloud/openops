import { getMessageButtons } from '../src/lib/common/actions-search';

describe('getMessageButtons', () => {
  test('should return empty when there are no buttons in the message', () => {
    const blocks: any[] = [];

    const result = getMessageButtons(blocks);

    expect(result).toEqual([]);
  });

  test('should return list of buttons found', () => {
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

    const result = getMessageButtons(blocks);

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
