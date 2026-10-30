import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from '../anodot-auth-property';
import { getAccountApiKey } from '../common/account';
import { createUmbrellaSession } from '../common/auth';
import { addRecommendationComment } from '../common/recommendation-comments';

export const addCommentAction = createAction({
  auth: anadotAuth,
  name: 'anodot_add_comment',
  description: 'Add a comment to a recommendation',
  displayName: 'Add Comment',
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
    comment: Property.LongText({
      displayName: 'Comment text',
      required: true,
    }),
  },
  async run(context) {
    const { comment, recommendationId, accountId } = context.propsValue;

    try {
      const session = await createUmbrellaSession(context.auth);
      const accountApiKey = await getAccountApiKey(accountId, session);

      const result = await addRecommendationComment(
        session.apiUrl,
        session.tokens.Authorization,
        accountApiKey,
        recommendationId,
        comment,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while adding a comment to Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.warn(errorMsg);

      throw new Error(errorMsg);
    }
  },
});
