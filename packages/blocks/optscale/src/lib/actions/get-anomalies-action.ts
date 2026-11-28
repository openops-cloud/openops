import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import {
  pathSegment,
  sendOptScaleRequest,
  toOptionalInteger,
} from '../common/make-request';
import { organizationProperty } from '../common/properties';

interface OrganizationConstraint {
  limit_hits?: unknown[];
}

export const getAnomaliesAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_anomalies',
  displayName: 'Get Anomalies and Policy Violations',
  description:
    'Get OptScale anomaly detection, quota, budget and tagging policies with their recent violations',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
    types: Property.StaticMultiSelectDropdown({
      displayName: 'Types',
      description: 'The policy types to fetch. Leave empty to include all.',
      required: false,
      options: {
        options: [
          { label: 'Expense anomaly', value: 'expense_anomaly' },
          { label: 'Resource count anomaly', value: 'resource_count_anomaly' },
          { label: 'Resource quota', value: 'resource_quota' },
          { label: 'Recurring budget', value: 'recurring_budget' },
          { label: 'Expiring budget', value: 'expiring_budget' },
          { label: 'Tagging policy', value: 'tagging_policy' },
        ],
      },
    }),
    hitDays: Property.Number({
      displayName: 'Violations From the Last N Days',
      description: 'How many days of violations (limit hits) to include',
      required: true,
      defaultValue: 7,
    }),
    onlyViolated: Property.Checkbox({
      displayName: 'Only Policies With Violations',
      description:
        'Only return policies that had at least one violation in the period',
      required: false,
      defaultValue: true,
    }),
  },
  async run(context) {
    const { organizationId, types, hitDays, onlyViolated } = context.propsValue;

    const hitDaysValue = toOptionalInteger(
      hitDays,
      'Violations From the Last N Days',
      1,
    );

    const { organization_constraints } = await sendOptScaleRequest<{
      organization_constraints: OrganizationConstraint[];
    }>({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/organizations/${pathSegment(organizationId)}/organization_constraints`,
      query: {
        type: types,
        hit_days: hitDaysValue,
      },
    });

    // The checkbox defaults to on, so treat an unset value as on.
    return onlyViolated !== false
      ? organization_constraints.filter(
          (constraint) => (constraint.limit_hits ?? []).length > 0,
        )
      : organization_constraints;
  },
});
