const createUmbrellaSessionMock = jest.fn();
const addRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  createUmbrellaSession: createUmbrellaSessionMock,
}));

jest.mock('../../src/lib/common/recommendation-comments', () => ({
  addRecommendationComment: addRecommendationCommentMock,
}));

jest.mock('../../src/lib/common/account', () => ({
  getAccountApiKey: getAccountApiKeyMock,
}));

import { addCommentAction } from '../../src/lib/comments/add-comment-action';

describe('addCommentAction', () => {
  const auth = {
    authUrl: 'some url',
    apiUrl: 'some api url',
    username: 'some username',
    password: 'some password',
  };

  const session = {
    version: '1.0',
    apiUrl: 'some api url',
    tokens: { Authorization: 'a bearer token', apikey: 'user-key:-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    createUmbrellaSessionMock.mockResolvedValue(session);
    getAccountApiKeyMock.mockResolvedValue('some account api key');
    addRecommendationCommentMock.mockResolvedValue('great success');
  });

  test('should add a comment', async () => {
    const context = createContext({
      recommendationId: 'some recommendation id',
      comment: 'some comment',
      accountId: 'some account id',
    });

    const result = await addCommentAction.run(context);

    expect(result).toEqual('great success');

    expect(createUmbrellaSessionMock).toHaveBeenCalledTimes(1);
    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);

    expect(getAccountApiKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountApiKeyMock).toHaveBeenCalledWith(
      'some account id',
      session,
    );

    expect(addRecommendationCommentMock).toHaveBeenCalledTimes(1);
    expect(addRecommendationCommentMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'some account api key',
      'some recommendation id',
      'some comment',
    );
  });

  test('should throw an error if an error occurs', async () => {
    addRecommendationCommentMock.mockRejectedValue(new Error('some error'));

    const context = createContext({
      recommendationId: 'some recommendation id',
      comment: 'some comment',
      accountId: 'some account id',
    });

    await expect(addCommentAction.run(context)).rejects.toThrow(
      "An error occurred while adding a comment to Umbrella recommendation 'some recommendation id' (account id: some account id): Error: some error",
    );
  });

  function createContext(props: unknown) {
    return {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: props,
    };
  }
});
