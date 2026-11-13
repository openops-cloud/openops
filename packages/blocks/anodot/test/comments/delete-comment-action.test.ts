const createUmbrellaSessionMock = jest.fn();
const deleteRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  createUmbrellaSession: createUmbrellaSessionMock,
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

  const session = {
    version: '1.0',
    apiUrl: 'some api url',
    tokens: { Authorization: 'a bearer token', apikey: 'user-key:-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    createUmbrellaSessionMock.mockResolvedValue(session);
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

    expect(createUmbrellaSessionMock).toHaveBeenCalledTimes(1);
    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);

    expect(getAccountApiKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountApiKeyMock).toHaveBeenCalledWith(
      'some account id',
      session,
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
