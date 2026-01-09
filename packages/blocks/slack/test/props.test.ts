const getSlackUsersMock = jest.fn();
const getSlackChannelsMock = jest.fn();

jest.mock('../src/lib/common/slack-api-request', () => ({
  getSlackUsers: getSlackUsersMock,
  getSlackChannels: getSlackChannelsMock,
}));

import { OAuth2PropertyValue } from '@openops/blocks-framework';
import { slackChannel, user, usersAndChannels } from '../src/lib/common/props';

describe('Props Common', () => {
  const mockAuth: OAuth2PropertyValue = {
    access_token: 'mock-token',
    data: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('channel dropdown', () => {
    test('should return error message if auth is not provided', async () => {
      const options = await slackChannel.options(
        { auth: null },
        createContext(),
      );
      expect(options.disabled).toBeTruthy();
      expect(options.options).toStrictEqual([]);
      expect(options.placeholder).toBe('connect slack account');
    });

    test('should return list of available channels', async () => {
      getSlackChannelsMock.mockResolvedValue([
        { name: 'general', id: 'C1' },
        { name: 'random', id: 'C2' },
      ]);

      const options = await slackChannel.options(
        { auth: mockAuth },
        createContext(),
      );
      expect(options.options).toEqual([
        { label: 'general', value: 'C1' },
        { label: 'random', value: 'C2' },
      ]);
    });
  });

  describe('users dropdown', () => {
    test('should return error message if auth is not provided', async () => {
      const options = await user.options({ auth: null }, createContext());
      expect(options.disabled).toBeTruthy();
      expect(options.options).toStrictEqual([]);
      expect(options.placeholder).toBe('connect slack account');
    });

    test('should return available users', async () => {
      getSlackUsersMock.mockResolvedValue([
        { name: 'Alice', id: 'U1', profile: {} },
        { name: 'Bob', id: 'U2', profile: { email: 'bob@email.com' } },
      ]);

      const options = await user.options({ auth: mockAuth }, createContext());
      expect(options.options).toEqual([
        { label: 'Alice', value: 'U1' },
        { label: 'Bob (bob@email.com)', value: 'U2' },
      ]);
    });
  });

  describe('usersAndChannels dropdown', () => {
    test('should return error message if auth is not provided', async () => {
      const options = await usersAndChannels.options(
        { auth: null },
        createContext(),
      );
      expect(options.disabled).toBeTruthy();
      expect(options.options).toStrictEqual([]);
      expect(options.placeholder).toBe('connect slack account');
    });

    test('should return available users and channels', async () => {
      getSlackChannelsMock.mockResolvedValue([
        { name: 'general', id: 'C1' },
        { name: 'random', id: 'C2' },
      ]);

      getSlackUsersMock.mockResolvedValue([
        { name: 'Alice', id: 'U1', profile: {} },
        { name: 'Bob', id: 'U2', profile: { email: 'bob@email.com' } },
      ]);

      const options = await usersAndChannels.options(
        { auth: mockAuth },
        createContext(),
      );
      expect(options.options).toEqual([
        { label: 'general', value: 'C1' },
        { label: 'random', value: 'C2' },
        { label: 'Alice', value: 'U1' },
        { label: 'Bob (bob@email.com)', value: 'U2' },
      ]);
    });

    test('should return only users when there are no channels', async () => {
      getSlackChannelsMock.mockResolvedValue([]);

      getSlackUsersMock.mockResolvedValue([
        { name: 'Alice', id: 'U1', profile: {} },
        { name: 'Bob', id: 'U2', profile: { email: 'bob@email.com' } },
      ]);

      const options = await usersAndChannels.options(
        { auth: mockAuth },
        createContext(),
      );
      expect(options.options).toEqual([
        { label: 'Alice', value: 'U1' },
        { label: 'Bob (bob@email.com)', value: 'U2' },
      ]);
    });

    test('should return only channels when there are no users', async () => {
      getSlackChannelsMock.mockResolvedValue([
        { name: 'general', id: 'C1' },
        { name: 'random', id: 'C2' },
      ]);

      getSlackUsersMock.mockResolvedValue([]);

      const options = await usersAndChannels.options(
        { auth: mockAuth },
        createContext(),
      );
      expect(options.options).toEqual([
        { label: 'general', value: 'C1' },
        { label: 'random', value: 'C2' },
      ]);
    });
  });
});

function createContext() {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
  };
}
