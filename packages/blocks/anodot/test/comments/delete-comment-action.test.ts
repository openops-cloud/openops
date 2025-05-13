const authenticateUserWithAnodotMock = jest.fn();
const deleteRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
}));

jest.mock('../../src/lib/common/recommendation-comments', () => ({
  deleteRecommendationComment: deleteRecommendationCommentMock,
}));

jest.mock('../../src/lib/common/account', () => ({
  getAccountApiKey: getAccountApiKeyMock,
}));

import { deleteCommentAction } from '../../src/lib/comments/delete-comment-action';

describe('deleteCommentAction', () => {
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
    deleteRecommendationCommentMock.mockResolvedValue('great success');
  });

  test('should delete a comment', async () => {
    const context = createContext({
      recommendationId: 'some recommendation id',
      commentId: 'some comment id',
      accountId: 'some account id',
    });

    const result = await deleteCommentAction.run(context);

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

    expect(deleteRecommendationCommentMock).toHaveBeenCalledTimes(1);
    expect(deleteRecommendationCommentMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'some account api key',
      'some recommendation id',
      'some comment id',
    );
  });

  test('should throw an error if an error occurs', async () => {
    deleteRecommendationCommentMock.mockRejectedValue(new Error('some error'));

    const context = createContext({
      recommendationId: 'some recommendation id',
      commentId: 'some comment id',
      accountId: 'some account id',
    });

    await expect(deleteCommentAction.run(context)).rejects.toThrow(
      "An error occurred while deleting comment 'some comment id' from Umbrella recommendation 'some recommendation id' (account id: some account id): Error: some error",
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
