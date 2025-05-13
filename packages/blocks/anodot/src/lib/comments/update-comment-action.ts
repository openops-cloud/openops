import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from '../anodot-auth-property';
import { getAccountApiKey } from '../common/account';
import { authenticateUserWithAnodot } from '../common/auth';
import { updateRecommendationComment } from '../common/recommendation-comments';

export const updateCommentAction = createAction({
  auth: anadotAuth,
  name: 'anodot_update_comment',
  description: 'Update a comment of a recommendation',
  displayName: 'Update Comment',
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
    comment: Property.LongText({
      displayName: 'Comment text',
      required: true,
    }),
  },
  async run(context) {
    const { commentId, recommendationId, accountId, comment } =
      context.propsValue;

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

      const result = await updateRecommendationComment(
        apiUrl,
        anodotTokens.Authorization,
        accountApiKey,
        recommendationId,
        commentId,
        comment,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while updating comment '${commentId}' of Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.error(errorMsg);

      throw new Error(errorMsg);
    }
  },
});
