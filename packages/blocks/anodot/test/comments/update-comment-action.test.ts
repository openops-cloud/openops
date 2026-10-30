const createUmbrellaSessionMock = jest.fn();
const updateRecommendationCommentMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../../src/lib/common/auth', () => ({
  createUmbrellaSession: createUmbrellaSessionMock,
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

  const session = {
    version: '1.0',
    apiUrl: 'some api url',
    tokens: { Authorization: 'a bearer token', apikey: 'user-key:-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    createUmbrellaSessionMock.mockResolvedValue(session);
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

    expect(createUmbrellaSessionMock).toHaveBeenCalledTimes(1);
    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);

    expect(getAccountApiKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountApiKeyMock).toHaveBeenCalledWith(
      'some account id',
      session,
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
      "An error occurred while updating comment 'some comment id' of Umbrella recommendation 'some recommendation id' (account id: some account id): Error: some error",
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
