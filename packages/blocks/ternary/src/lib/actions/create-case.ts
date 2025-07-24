import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';
import { getCaseTypesProperty } from '../common/case-types-property';
import { getResourceTypesProperty } from '../common/resource-types-property';
import { getUsersIDsDropdownProperty } from '../common/users';

export const createCaseAction = createAction({
  name: 'create_case',
  displayName: 'Create a Case',
  description: 'Create a Case',
  auth: ternaryCloudAuth,
  props: {
    resourceID: Property.ShortText({
      displayName: 'Resource ID',
      description: '',
      required: true,
    }),
    caseName: Property.ShortText({
      displayName: 'Case name',
      description: '',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Case description',
      description: '',
      required: true,
    }),
    resourceType: getResourceTypesProperty(),
    caseType: getCaseTypesProperty(),
    assigneeIDs: getUsersIDsDropdownProperty('Case assignee IDs'),
    followerIDs: getUsersIDsDropdownProperty('Case follower IDs'),
    forecastContext: Property.Number({
      displayName: 'Forecast context number',
      description: '',
      required: false,
    }),
    linkToJira: Property.Checkbox({
      displayName: 'Link case to Jira',
      description: '',
      required: false,
    }),
  },
  run: async ({ auth, propsValue }) => {
    const { assigneeIDs, followerIDs, forecastContext } = propsValue;

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

    if (forecastContext) {
      body['context'] = {
        forecast: forecastContext,
      };
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
