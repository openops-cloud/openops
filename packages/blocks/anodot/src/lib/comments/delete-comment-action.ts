import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from '../anodot-auth-property';
import { getAccountApiKey } from '../common/account';
import { createUmbrellaSession } from '../common/auth';
import { deleteRecommendationComment } from '../common/recommendation-comments';

export const deleteCommentAction = createAction({
  auth: anadotAuth,
  name: 'anodot_delete_comment',
  description: 'Delete a comment from a recommendation',
  displayName: 'Delete Comment',
  isWriteAction: true,
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
      const session = await createUmbrellaSession(context.auth);
      const accountApiKey = await getAccountApiKey(accountId, session);

      const result = await deleteRecommendationComment(
        session.apiUrl,
        session.tokens.Authorization,
        accountApiKey,
        recommendationId,
        commentId,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while deleting comment '${commentId}' from Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.warn(errorMsg);

      throw new Error(errorMsg);
    }
  },
});
