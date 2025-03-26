const authenticateUserWithAnodotMock = jest.fn();
const updateRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
}));

jest.mock('../../src/lib/common/recommendation-comments', () => ({
  updateRecommendationComment: updateRecommendationCommentMock,
}));

jest.mock('../../src/lib/common/account', () => ({
  getAccountApiKey: getAccountApiKeyMock,
}));

import { updateCommentAction } from '../../src/lib/comments/update-comment-action';

describe('updateCommentAction', () => {
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
    updateRecommendationCommentMock.mockResolvedValue('great success');
  });

  test('should update a comment', async () => {
    const context = createContext({
      recommendationId: 'some recommendation id',
      commentId: 'some comment id',
      comment: 'new text',
      accountId: 'some account id',
    });

    const result = await updateCommentAction.run(context);

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

    expect(updateRecommendationCommentMock).toHaveBeenCalledTimes(1);
    expect(updateRecommendationCommentMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'some account api key',
      'some recommendation id',
      'some comment id',
      'new text',
    );
  });

  test('should throw an error if an error occurs', async () => {
    updateRecommendationCommentMock.mockRejectedValue(new Error('some error'));

    const context = createContext({
      recommendationId: 'some recommendation id',
      commentId: 'some comment id',
      comment: 'new text',
      accountId: 'some account id',
    });

    await expect(updateCommentAction.run(context)).rejects.toThrow(
      "An error occurred while updating comment 'some comment id' of Anodot recommendation 'some recommendation id' (account id: some account id): Error: some error",
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
