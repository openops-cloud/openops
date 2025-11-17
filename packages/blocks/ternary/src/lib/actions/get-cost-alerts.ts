import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { AlertStatus, getCostAlerts } from '../common/alerts-api';
import { ternaryCloudAuth } from '../common/auth';
import { CasesFilter, getCases } from '../common/cases-api';

export const getCostAlertsAction = createAction({
  name: 'get_cost_alerts',
  displayName: 'Get Anomalies',
  description: 'Get cost anomalies and alerts from Ternary',
  auth: ternaryCloudAuth,
  isWriteAction: false,
  props: {
    statusFilter: Property.StaticMultiSelectDropdown({
      displayName: 'Status',
      description: 'Filter by status',
      required: true,
      defaultValue: [AlertStatus.ACTIVE],
      options: {
        options: [
          { label: 'Active', value: AlertStatus.ACTIVE },
          { label: 'Investigating', value: AlertStatus.INVESTIGATING },
          { label: 'Resolved', value: AlertStatus.RESOLVED },
          { label: 'Unresolved', value: AlertStatus.UNRESOLVED },
        ],
      },
    }),
    casesFilter: Property.StaticDropdown({
      displayName: 'Case Status',
      description: 'Whether to include alerts that have related cases',
      required: true,
      options: {
        options: [
          {
            label: 'Show all alerts',
            value: CasesFilter.ALL,
          },
          {
            label: 'Show only alerts without cases',
            value: CasesFilter.ONLY_WITHOUT_CASES,
          },

          {
            label: 'Show only alerts with cases',
            value: CasesFilter.ONLY_WITH_CASES,
          },
        ],
      },
      defaultValue: CasesFilter.ALL,
    }),
  },
  run: async ({ propsValue, auth }) => {
    const { casesFilter, statusFilter } = propsValue;

    try {
      const alerts = await getCostAlerts(auth);

      const filteredByStatus = alerts.filter((x) =>
        statusFilter.includes(x.status),
      );

      const cases = await getCases(auth);

      for (const alert of filteredByStatus) {
        alert.case = cases.find((c) => c.resourceID === alert.id);
      }

      switch (casesFilter) {
        case CasesFilter.ONLY_WITH_CASES:
          return filteredByStatus.filter((alert) => alert.case);
        case CasesFilter.ONLY_WITHOUT_CASES:
          return filteredByStatus.filter((alert) => !alert.case);
        default:
          return filteredByStatus;
      }
    } catch (e) {
      logger.warn('Error getting anomalies list.', e);
      throw e;
    }
  },
});
