const mockChatOptions = [
  { label: 'Chat A', value: { id: '001', type: 'chat' } },
  { label: 'Chat B', value: { id: '002', type: 'chat' } },
];

const mockChannelOptionsTeam1 = [
  {
    label: 'Channel A',
    value: { id: '100', teamId: 'team1', type: 'channel' },
  },
  {
    label: 'Channel B',
    value: { id: '101', teamId: 'team1', type: 'channel' },
  },
];

const mockChannelOptionsTeam2 = [
  {
    label: 'Channel C',
    value: { id: '102', teamId: 'team2', type: 'channel' },
  },
];

const mockGetAllChatOptions = jest.fn(async () => mockChatOptions);
const mockGetAllTeams = jest.fn(async () => ['team1', 'team2']);
const mockGetAllChannelOptionsByTeam = jest.fn(
  async (auth: any, teamId: string) => {
    if (teamId === 'team1') return Promise.resolve(mockChannelOptionsTeam1);
    if (teamId === 'team2') return Promise.resolve(mockChannelOptionsTeam2);
    return [];
  },
);

jest.mock('../src/lib/common/get-all-chat-options', () => ({
  getAllChatOptions: mockGetAllChatOptions,
}));

jest.mock('../src/lib/common/get-all-teams', () => ({
  getAllTeams: mockGetAllTeams,
}));

jest.mock('../src/lib/common/get-all-channel-options-by-team', () => ({
  getAllChannelOptionsByTeam: mockGetAllChannelOptionsByTeam,
}));

import { PropertyContext } from '@openops/blocks-framework';
import { chatsAndChannels } from '../src/lib/common/chats-and-channels';

describe('chatsAndChannels property', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a list of chats and channels', async () => {
    const auth = { access_token: 'valid_token', data: {} };
    const result = await chatsAndChannels.options(
      { auth },
      {} as PropertyContext,
    );

    expect(mockGetAllChatOptions).toHaveBeenCalledTimes(1);
    expect(mockGetAllChatOptions).toHaveBeenCalledWith(auth);

    expect(mockGetAllTeams).toHaveBeenCalledTimes(1);
    expect(mockGetAllTeams).toHaveBeenCalledWith(auth);

    expect(mockGetAllChannelOptionsByTeam).toHaveBeenCalledTimes(2);
    expect(mockGetAllChannelOptionsByTeam).toHaveBeenCalledWith(auth, 'team1');
    expect(mockGetAllChannelOptionsByTeam).toHaveBeenCalledWith(auth, 'team2');

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Chat A', value: { id: '001', type: 'chat' } },
        { label: 'Chat B', value: { id: '002', type: 'chat' } },
        {
          label: 'Channel A',
          value: { id: '100', teamId: 'team1', type: 'channel' },
        },
        {
          label: 'Channel B',
          value: { id: '101', teamId: 'team1', type: 'channel' },
        },
        {
          label: 'Channel C',
          value: { id: '102', teamId: 'team2', type: 'channel' },
        },
      ],
    });
  });

  test('should return disabled with a message if auth is missing', async () => {
    const result = await chatsAndChannels.options(
      { auth: null },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please connect your account first and select team.',
      options: [],
    });
  });

  test('should flatten and combine multiple team channels correctly', async () => {
    const auth = { access_token: 'valid_token', data: {} };
    const result = await chatsAndChannels.options(
      { auth },
      {} as PropertyContext,
    );

    expect(mockGetAllTeams).toHaveBeenCalledTimes(1);
    expect(mockGetAllChannelOptionsByTeam).toHaveBeenCalledTimes(2);
    expect(mockGetAllChatOptions).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      disabled: false,
      options: [
        ...mockChatOptions,
        ...mockChannelOptionsTeam1,
        ...mockChannelOptionsTeam2,
      ],
    });
  });

  test('should handle empty teams or channels gracefully', async () => {
    mockGetAllTeams.mockResolvedValueOnce([]);
    mockGetAllChannelOptionsByTeam.mockResolvedValueOnce([]);

    const auth = { access_token: 'valid_token', data: {} };
    const result = await chatsAndChannels.options(
      { auth },
      {} as PropertyContext,
    );

    expect(mockGetAllTeams).toHaveBeenCalledTimes(1);
    expect(mockGetAllChannelOptionsByTeam).not.toHaveBeenCalled();
    expect(mockGetAllChatOptions).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      disabled: false,
      options: mockChatOptions,
    });
  });
});
