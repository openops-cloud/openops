import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { getCaseTypesProperty } from '../common/case-types-property';
import { getResourceTypesProperty } from '../common/resource-types-property';
import { sendTernaryRequest } from '../common/send-ternary-request';
import { getUsersIDsDropdownProperty } from '../common/users';

export const createCaseAction = createAction({
  name: 'create_case',
  displayName: 'Create a Case',
  description: 'Create a Case',
  auth: ternaryCloudAuth,
  requireToolApproval: false,
  props: {
    resourceID: Property.ShortText({
      displayName: 'Resource ID',
      required: true,
    }),
    caseName: Property.ShortText({
      displayName: 'Name',
      description: 'Case name',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Case description',
      required: true,
    }),
    caseType: getCaseTypesProperty(),
    resourceType: getResourceTypesProperty(),
    assigneeIDs: getUsersIDsDropdownProperty('Assignee IDs'),
    followerIDs: getUsersIDsDropdownProperty('Follower IDs'),
    linkToJira: Property.Checkbox({
      displayName: 'Link case to Jira',
      description:
        'Indicates whether a Jira ticket should be created for this case',
      required: false,
    }),
  },
  run: async ({ auth, propsValue }) => {
    const { assigneeIDs, followerIDs } = propsValue;

    const body: Record<string, any> = {
      tenantID: auth.tenantId,
      resourceID: propsValue.resourceID,
      description: propsValue.description,
      name: propsValue.caseName,
      resourceType: propsValue.resourceType,
      type: propsValue.caseType,
      linkToJira: propsValue.linkToJira,
    };

    if (assigneeIDs && assigneeIDs.length > 0) {
      body['assigneeIDs'] = assigneeIDs;
    }

    if (followerIDs && followerIDs.length > 0) {
      body['followerIDs'] = followerIDs;
    }

    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.POST,
        url: 'cases',
        body,
      });
      return response.body as any[];
    } catch (error) {
      logger.error('Error creating a new case.', error);
      throw error;
    }
  },
});
