const authenticateUserWithAnodotMock = jest.fn();
const addRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
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

  const anodotTokens = {
    Authorization: 'a bearer token',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authenticateUserWithAnodotMock.mockResolvedValue(anodotTokens);
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

    expect(authenticateUserWithAnodotMock).toHaveBeenCalledTimes(1);
    expect(authenticateUserWithAnodotMock).toHaveBeenCalledWith(
      'some url',
      'some username',
      'some password',
    );

    expect(getAccountApiKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountApiKeyMock).toHaveBeenCalledWith(
      'some account id',
      'some api url',
      anodotTokens,
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
      "An error occurred while adding a comment to Anodot recommendation 'some recommendation id' (account id: some account id): Error: some error",
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
