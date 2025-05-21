import { microsoftTeams } from '../src/index';

describe('block declaration tests', () => {
  test('should return correct display name', () => {
    expect(microsoftTeams.displayName).toEqual('Microsoft Teams');
  });

  test('should return correct actions', () => {
    expect(Object.keys(microsoftTeams.actions()).length).toBe(4);
    expect(microsoftTeams.actions()).toMatchObject({
      microsoft_teams_send_channel_message: {
        name: 'microsoft_teams_send_channel_message',
      },
      microsoft_teams_send_chat_message: {
        name: 'microsoft_teams_send_chat_message',
      },
      microsoft_teams_request_action_message: {
        name: 'microsoft_teams_request_action_message',
      },
      custom_api_call: {
        name: 'custom_api_call',
      },
    });
  });
});
