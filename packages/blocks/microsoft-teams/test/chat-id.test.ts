import { PropertyContext } from '@openops/blocks-framework';
import { chatId } from '../src/lib/common/chat-id';

const mockGet = jest.fn(() => ({
  value: [{ id: '100', chatType: 'oneOnOne', topic: 'Chat A' }],
  '@odata.nextLink': null,
}));
const mockExpand = jest.fn(() => ({
  get: mockGet,
}));

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      expand: mockExpand,
    })),
  })),
}));

describe('chatId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a list of chats', async () => {
    const auth = { access_token: 'valid_token', data: {} };
    const result = await chatId.options({ auth }, {} as PropertyContext);

    expect(result).toEqual({
      disabled: false,
      options: [{ label: '(1 : 1 Chat) Chat A', value: '100' }],
    });
  });

  test('should return disabled with a message if auth is missing', async () => {
    const result = await chatId.options({ auth: null }, {} as PropertyContext);
    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please connect your account first and select team.',
      options: [],
    });
  });
});
