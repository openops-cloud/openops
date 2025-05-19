import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { isEmpty } from '@openops/shared';
import { anadotAuth } from './anodot-auth-property';
import { getAccountApiKey } from './common/account';
import { authenticateUserWithAnodot } from './common/auth';
import { setUserStatusForRecommendation } from './common/recommendations';

export const updateUserStatusAction = createAction({
  auth: anadotAuth,
  name: 'update_user_status',
  description: 'Set the user status of the given recommendation',
  displayName: 'Update User Status',
  props: {
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    recommendationId: Property.ShortText({
      displayName: 'Recommendation ID',
      required: true,
    }),
    userStatus: Property.StaticDropdown({
      displayName: 'Status',
      description: 'A list of action statuses',
      required: true,
      options: {
        options: [
          { label: 'Done', value: 'done' },
          { label: 'Undone', value: 'undone' },
          { label: 'Include', value: 'include' },
          { label: 'Exclude', value: 'exclude' },
          { label: 'Star', value: 'star' },
          { label: 'Unstar', value: 'unstar' },
          { label: 'Label', value: 'label' },
        ],
      },
    }),
    actionParams: Property.DynamicProperties({
      displayName: 'Action Parameters',
      description: 'Additional parameters based on the selected user status.',
      required: false,
      refreshers: ['userStatus'],
      props: async (props): Promise<{ [key: string]: any }> => {
        switch (props['userStatus'] as unknown as string) {
          case 'label':
            return {
              label_add: Property.LongText({
                displayName: 'Add Labels',
                description:
                  'A comma seperated list of labels to add to the recommendation.',
                required: false,
              }),
              label_delete: Property.LongText({
                displayName: 'Delete Labels',
                description:
                  'A comma seperated list of labels to remove from the recommendation.',
                required: false,
              }),
            };
          case 'exclude':
            return {
              comment: Property.LongText({
                displayName: 'Comment',
                description: 'Comment explaining why the action is excluded.',
                required: true,
              }),
              until: Property.LongText({
                displayName: 'Until Date',
                description:
                  'Date until the exclusion ends. (Format yyyy-mm-ddThh:mm:ss+00:00)',
                required: false,
              }),
            };
          default:
            return {};
        }
      },
    }),
  },
  async run(context) {
    const { userStatus, recommendationId, accountId } = context.propsValue;

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
      const actionParams = getActionParams(context);

      const result = await setUserStatusForRecommendation(
        apiUrl,
        anodotTokens.Authorization,
        accountApiKey,
        recommendationId,
        userStatus,
        actionParams,
      );

      return result;
    } catch (error) {
      const errorMsg = `An error occurred while setting user status '${userStatus}' on Umbrella recommendation '${recommendationId}' (account id: ${accountId}): ${error}`;

      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  },
});

function getActionParams(context: any): any {
  const { userStatus, actionParams } = context.propsValue;
  switch (userStatus) {
    case 'label':
      if (
        isEmpty(actionParams['label_add']) &&
        isEmpty(actionParams['label_delete'])
      ) {
        throw new Error(
          'At least one of: label_add or label_delete fields must be filled.',
        );
      }
      return {
        data: {
          label_add: actionParams['label_add'],
          label_delete: actionParams['label_delete'],
        },
      };
    case 'exclude':
      return {
        data: {
          comment: actionParams['comment'],
          until: actionParams['until'],
        },
      };
    default:
      return {};
  }
}
