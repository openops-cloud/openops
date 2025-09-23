import { PropertyContext } from '@openops/blocks-framework';
import { channelId } from '../src/lib/common/channel-id';

const mockGet = jest.fn(() => ({
  value: [
    { id: '10', displayName: 'General' },
    { id: '20', displayName: 'Random' },
  ],
}));

jest.mock('@openops/common', () => ({
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      get: mockGet,
    })),
  })),
}));

describe('microsoftTeamsCommon.channelId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a list of channels for a team', async () => {
    const auth = { access_token: 'valid_token', data: {} };
    const result = await channelId.options(
      {
        auth,
        teamId: '1',
      },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'General', value: '10' },
        { label: 'Random', value: '20' },
      ],
    });
  });

  test('should return disabled with a message if auth or teamId is missing', async () => {
    const result = await channelId.options(
      {
        auth: null,
        teamId: null,
      },
      {} as PropertyContext,
    );
    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please connect your account first and select team.',
      options: [],
    });
  });
});
