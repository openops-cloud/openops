import { createAction, Property } from '@openops/blocks-framework';
import { flexeraAuth } from '../auth';
import { getIncident } from '../common/governance-api';

export const getIncidentAction = createAction({
  auth: flexeraAuth,
  name: 'flexera_get_incident',
  description: 'Get Incident',
  displayName: 'Get Incident',
  isWriteAction: false,
  props: {
    incidentId: Property.ShortText({
      displayName: 'Incident ID',
      description: 'The ID of the incident to get.',
      required: true,
    }),
  },
  async run(context) {
    const { refreshToken, appRegion, projectId } = context.auth;
    const { incidentId } = context.propsValue;

    const incident = await getIncident({
      refreshToken,
      appRegion,
      projectId,
      incidentId,
    });

    return incident;
  },
});
