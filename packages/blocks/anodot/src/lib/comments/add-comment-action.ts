import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from '../anodot-auth-property';
import { getAccountApiKey } from '../common/account';
import { authenticateUserWithAnodot } from '../common/auth';
import { addRecommendationComment } from '../common/recommendation-comments';

export const addCommentAction = createAction({
  auth: anadotAuth,
  name: 'anodot_add_comment',
  description: 'Add a comment to a recommendation',
  displayName: 'Add Comment',
  props: {
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    recommendationId: Property.ShortText({
      displayName: 'Recommendation ID',
      required: true,
    }),
    comment: Property.LongText({
      displayName: 'Comment text',
      required: true,
    }),
  },
  async run(context) {
    const { comment, recommendationId, accountId } = context.propsValue;

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

      const result = await addRecommendationComment(
        apiUrl,
        anodotTokens.Authorization,
        accountApiKey,
        recommendationId,
        comment,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while adding a comment to Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.error(errorMsg);

      throw new Error(errorMsg);
    }
  },
});
