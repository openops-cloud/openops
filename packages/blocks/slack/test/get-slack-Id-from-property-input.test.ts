const getUserByEmailMock = jest.fn();
jest.mock('../src/lib/common/slack-api-request', () => ({
  getUserByEmail: getUserByEmailMock,
}));

import { getSlackIdFromPropertyInput } from '../src/lib/common/get-slack-users';

describe('getSlackIdFromPropertyInput', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const accessToken = 'mockAccessToken';

  test.each([[null], [undefined], [1], [{}], [[]]])(
    'should return an error if the parameter is not a string',
    async (usersInput) => {
      await expect(
        getSlackIdFromPropertyInput(accessToken, usersInput as any),
      ).rejects.toThrow('Invalid input format provided for the user id/email.');

      expect(getUserByEmailMock).not.toHaveBeenCalled();
    },
  );

  test('should return the user id without making requests if an email is not provided.', async () => {
    const usersInput = 'user1';

    const result = await getSlackIdFromPropertyInput(accessToken, usersInput);
    expect(result).toEqual(usersInput);

    expect(getUserByEmailMock).not.toHaveBeenCalled();
  });

  test.each([null, undefined, ''])(
    'should throw an error if the user is not found',
    async (findUserResponse) => {
      const usersInput = 'usernotfound@example.com';
      getUserByEmailMock.mockResolvedValueOnce(findUserResponse);

      await expect(
        getSlackIdFromPropertyInput(accessToken, usersInput as any),
      ).rejects.toThrow(
        `Could not find a user that matches the email ${usersInput}`,
      );

      expect(getUserByEmailMock).toHaveBeenCalledWith(accessToken, usersInput);
    },
  );

  test('should search for a user by email and return the userId', async () => {
    const expectedSlackUser = {
      id: 'U1',
      name: 'User1',
      profile: { email: 'user1@example.com' },
    };
    getUserByEmailMock.mockResolvedValueOnce(expectedSlackUser);

    const usersInput = expectedSlackUser.profile.email;

    const result = await getSlackIdFromPropertyInput(accessToken, usersInput);

    expect(result).toEqual(expectedSlackUser.id);
    expect(getUserByEmailMock).toHaveBeenCalledWith(
      accessToken,
      'user1@example.com',
    );
  });
});
