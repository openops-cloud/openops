import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { pathSegment, sendOptScaleRequest } from '../common/make-request';
import { organizationProperty } from '../common/properties';

export const getEmployeesAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_employees',
  displayName: 'Get Employees',
  description:
    'Get the employees of an OptScale organization. Employee IDs identify resource owners.',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
  },
  async run(context) {
    const { employees } = await sendOptScaleRequest<{ employees: unknown[] }>({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/organizations/${pathSegment(context.propsValue.organizationId)}/employees`,
    });

    return employees;
  },
});
