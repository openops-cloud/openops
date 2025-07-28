import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { VegaCloudAuth, vegacloudAuth } from '../auth';
import { makeRequest } from '../common';

export const getAnomaliesAction = createAction({
  name: `vegacloud_get_anomalies`,
  displayName: `Get Anomalies`,
  description: `Get Anomalies`,
  auth: vegacloudAuth,
  props: {
    fromDate: Property.ShortText({
      displayName: 'From date',
      description: 'The start date for fetching anomalies (format: YYYYMMDD)',
      required: true,
    }),
    toDate: Property.ShortText({
      displayName: 'To date',
      description: 'The end date for fetching anomalies (format: YYYYMMDD)',
      required: true,
    }),
    additionalFilters: Property.DynamicProperties({
      displayName: 'Additional filters',
      description:
        'Additional filters to apply to the search. See more at https://docs.vegacloud.io/docs/api/data_api#filtering-data',
      required: false,
      refreshers: ['auth'],
      props: async ({ auth }) => {
        if (!auth) {
          return {};
        }
        const properties: { [key: string]: any } = {};

        const filterFields = await getFields(auth as VegaCloudAuth);

        properties['additionalFilters'] = Property.Array({
          displayName: 'Fields to filter by',
          required: false,
          properties: {
            fieldName: Property.StaticDropdown<string>({
              displayName: 'Field name',
              required: true,
              options: {
                options: filterFields.map((f) => ({
                  label: f,
                  value: f,
                })),
              },
            }),
            operator: Property.StaticDropdown({
              displayName: 'Operator',
              required: true,
              options: {
                options: [
                  // https://docs.vegacloud.io/docs/api/data_api#valid-operators
                  { label: 'Equal to', value: '=' },
                  { label: 'Not equal to', value: '<>' },
                  { label: 'Greater than', value: '>' },
                  { label: 'Less than', value: '<' },
                  { label: 'Greater than or equal to', value: '>=' },
                  { label: 'Less than or equal to', value: '<=' },
                  { label: 'Between two values (inclusive)', value: 'BETWEEN' },
                  { label: 'Pattern matching (case-sensitive)', value: 'LIKE' },
                  {
                    label: 'Pattern matching (case-insensitive)',
                    value: 'ILIKE',
                  },
                  {
                    label: 'SQL standard regex pattern matching',
                    value: 'SIMILAR',
                  },
                ],
              },
            }),
            value: Property.ShortText({
              displayName: 'Value',
              description: 'The value to filter the anomalies by',
              required: true,
            }),
          },
        });
        return properties;
      },
    }),
  },
  async run(context) {
    const { fromDate, toDate, additionalFilters } = context.propsValue;
    const { auth } = context;

    const result = await getAnomalies({
      auth,
      fromDate,
      toDate,
      additionalFilters: additionalFilters
        ? (additionalFilters['additionalFilters'] as any)
        : undefined,
    });

    return result;
  },
});

async function getAnomalies({
  auth,
  fromDate,
  toDate,
  additionalFilters,
}: {
  auth: VegaCloudAuth;
  fromDate: string;
  toDate: string;
  additionalFilters:
    | { fieldName: string; operator: string; value: string }[]
    | undefined;
}) {
  let query = `starting_date:between:${fromDate}-${toDate}`;

  const filterQuery = (additionalFilters || [])
    .map((filter) => `${filter.fieldName}:${filter.operator}:${filter.value}`)
    .join(',');

  query = query + (filterQuery.length ? `,${filterQuery}` : '');

  const response = await makeRequest({
    auth,
    url: 'https://data.api.vegacloud.io/anomalies',
    method: HttpMethod.GET,
    queryParams: {
      filter_by: query,
    },
  });

  return response;
}

async function getFields(auth: VegaCloudAuth): Promise<any[]> {
  const response = await makeRequest({
    auth,
    url: 'https://data.api.vegacloud.io/query/schema',
    method: HttpMethod.GET,
  });

  return (
    response.result?.find(
      (x: { model_name: string; fields: any[] }) => x.model_name === 'Anomaly',
    )?.fields || []
  );
}
