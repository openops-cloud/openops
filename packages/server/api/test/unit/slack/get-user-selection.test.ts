/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserSelection } from '../../../src/app/slack/get-user-selection';

describe('getUserSelection', () => {
  test.each([
    [
      [
        {
          action_id: 'P05mj',
          block_id: 'actions',
          text: { type: 'plain_text', text: 'Approve', emoji: true },
          style: 'primary',
          type: 'button',
          action_ts: '1753050100.323902',
        },
      ],
      { value: 'Approve', displayText: 'Approve' },
    ],
    [
      [
        {
          type: 'timepicker',
          action_id: 'actionId-0',
          block_id: '0lBrL',
          selected_time: '04:00',
          initial_time: '13:37',
          action_ts: '1753026721.083209',
        },
      ],
      { value: '04:00', displayText: '04:00' },
    ],
    [
      [
        {
          type: 'datepicker',
          action_id: 'actionId-0',
          block_id: 'cmZS9',
          selected_date: '1990-04-03',
          initial_date: '1990-04-28',
          action_ts: '1753026749.382067',
        },
      ],
      { value: '1990-04-03', displayText: '1990-04-03' },
    ],
    [
      [
        {
          type: 'radio_buttons',
          action_id: 'actionId-0',
          block_id: 'jwYLu',
          selected_option: {
            text: {
              type: 'plain_text',
              text: '*plain_text option 1*',
              emoji: true,
            },
            value: 'value-1',
          },
          action_ts: '1753026777.115740',
        },
      ],
      { value: 'value-1', displayText: '*plain_text option 1*' },
    ],
    [
      [
        {
          type: 'conversations_select',
          action_id: 'actionId-0',
          block_id: 'auyf+',
          selected_conversation: 'U07TNHNRE8M',
          action_ts: '1753026803.939063',
        },
      ],
      { value: 'U07TNHNRE8M', displayText: 'U07TNHNRE8M' },
    ],
    [
      [
        {
          type: 'channels_select',
          action_id: 'actionId-1',
          block_id: 'auyf+',
          selected_channel: 'C05UC9WD6EM',
          action_ts: '1753026807.373089',
        },
      ],
      { value: 'C05UC9WD6EM', displayText: 'C05UC9WD6EM' },
    ],
    [
      [
        {
          type: 'users_select',
          action_id: 'actionId-2',
          block_id: 'auyf+',
          selected_user: 'U07AABKFDR8',
          action_ts: '1753026838.424284',
        },
      ],
      { value: 'U07AABKFDR8', displayText: 'U07AABKFDR8' },
    ],
    [
      [
        {
          type: 'static_select',
          action_id: 'actionId-3',
          block_id: 'auyf+',
          selected_option: {
            text: {
              type: 'plain_text',
              text: '*plain_text option 1*',
              emoji: true,
            },
            value: 'value-1',
          },
          placeholder: {
            type: 'plain_text',
            text: 'Select an item',
            emoji: true,
          },
          action_ts: '1753026861.526384',
        },
      ],
      { value: 'value-1', displayText: '*plain_text option 1*' },
    ],
    [
      [
        {
          type: 'multi_static_select',
          action_id: 'multi_static_select-action',
          block_id: 'bqFU3',
          selected_options: [
            {
              text: {
                type: 'plain_text',
                text: '*plain_text option 0*',
                emoji: true,
              },
              value: 'value-0',
            },
            {
              text: {
                type: 'plain_text',
                text: '*plain_text option 1*',
                emoji: true,
              },
              value: 'value-1',
            },
          ],
          placeholder: {
            type: 'plain_text',
            text: 'Select options',
            emoji: true,
          },
          action_ts: '1753026949.007097',
        },
      ],
      [
        { value: 'value-0', displayText: '*plain_text option 0*' },
        { value: 'value-1', displayText: '*plain_text option 1*' },
      ],
    ],
  ])(
    'should return correct selection for payload %#',
    (payload: any, expected: any) => {
      expect(getUserSelection(payload)).toEqual(expected);
    },
  );
});
