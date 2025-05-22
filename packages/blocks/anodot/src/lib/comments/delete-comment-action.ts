import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from '../anodot-auth-property';
import { getAccountApiKey } from '../common/account';
import { authenticateUserWithAnodot } from '../common/auth';
import { deleteRecommendationComment } from '../common/recommendation-comments';

export const deleteCommentAction = createAction({
  auth: anadotAuth,
  name: 'anodot_delete_comment',
  description: 'Delete a comment from a recommendation',
  displayName: 'Delete Comment',
  props: {
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    recommendationId: Property.ShortText({
      displayName: 'Recommendation ID',
      required: true,
    }),
    commentId: Property.ShortText({
      displayName: 'Comment ID',
      required: true,
    }),
  },
  async run(context) {
    const { commentId, recommendationId, accountId } = context.propsValue;

    try {
      const { authUrl, apiUrl, username, password } = context.auth;
      const anodotTokens = await authenticateUserWithAnodot(
        authUrl,
        username,
        password,
      );
      const accountApiKey = await getAccountApiKey(
        accountId,
        apiUrl,
        anodotTokens,
      );

      const result = await deleteRecommendationComment(
        apiUrl,
        anodotTokens.Authorization,
        accountApiKey,
        recommendationId,
        commentId,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while deleting comment '${commentId}' from Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.error(errorMsg);

      throw new Error(errorMsg);
    }
  },
});
