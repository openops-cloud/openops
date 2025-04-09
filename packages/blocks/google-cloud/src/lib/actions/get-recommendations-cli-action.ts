import { createAction, Property } from '@openops/blocks-framework';
import {
  getUseHostSessionProperty,
  googleCloudAuth,
  handleCliError,
  tryParseJson,
} from '@openops/common';
import { runCommand, runCommands } from '../google-cloud-cli';

export const getRecommendationsAction = createAction({
  auth: googleCloudAuth,
  name: 'google_get_recommendations_cli',
  description: 'Fetch the recommendations for the selected recommenders',
  displayName: 'Get Recommendations',
  props: {
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    filterBySelection: Property.StaticDropdown({
      displayName: 'Choose filter',
      description:
        'Select whether to filter by billing account, folder ID, organization ID, or project ID.',
      required: true,
      options: {
        options: [
          {
            label: 'Filter by Billing Account',
            value: 'billingAccount',
          },
          {
            label: 'Filter by Organization ID',
            value: 'organization',
          },
          {
            label: 'Filter by Project ID',
            value: 'project',
          },
          {
            label: 'Filter by Folder ID',
            value: 'folder',
          },
        ],
      },
    }),
    filterByProperty: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: [
        'auth',
        'useHostSession',
        'useHostSession.useHostSessionCheckbox',
        'filterBySelection',
      ],
      props: async ({
        auth,
        useHostSession,
        filterBySelection,
      }): Promise<{ [key: string]: any }> => {
        const shouldUseHostCredentials =
          (useHostSession as { useHostSessionCheckbox?: boolean })
            ?.useHostSessionCheckbox === true;

        if (!auth && !shouldUseHostCredentials) {
          return {
            markdown: Property.MarkDown({
              value: 'Please authenticate to see the filter options.',
            }),
          };
        }

        if (!filterBySelection) {
          return {
            markdown: Property.MarkDown({
              value:
                'Please select a filter from the dropdown to see the options.',
            }),
          };
        }

        return await getScopeOptionProperty(
          auth,
          shouldUseHostCredentials,
          filterBySelection,
        );
      },
    }),
    recommenders: getRecommendersDropdown(),
    location: Property.ShortText({
      displayName: 'Location',
      description: 'Location to list recommendations for.',
      required: true,
    }),
  },
  async run(context) {
    const currentCommand = '';
    try {
      const { filterByProperty, location, recommenders } = context.propsValue;

      if (!recommenders) {
        throw new Error('Recommenders are required');
      }

      let baseCommand = `gcloud recommender recommendations list --format=json ${getFilterByPropertyCommandParam(
        filterByProperty,
      )}`;

      if (location) {
        baseCommand += ` --location=${location}`;
      }

      const commands = recommenders.map(
        (recommender) => `${baseCommand} --recommender=${recommender}`,
      );

      const results = await runCommands(
        commands,
        context.auth,
        context.propsValue.useHostSession?.['useHostSessionCheckbox'],
      );

      const allRecommendations = results.flatMap((result, i) => {
        const parsed = tryParseJson(result);
        return Array.isArray(parsed)
          ? parsed.map((item) => ({
              ...item,
              source: recommenders[i],
            }))
          : [];
      });

      return allRecommendations;
    } catch (error) {
      handleCliError({
        provider: 'Google Cloud',
        command: currentCommand,
        error,
      });
    }
  },
});

async function getScopeOptionProperty(
  auth: any,
  useHostSession: any,
  filterSelection: any,
) {
  if (filterSelection === 'folder') {
    return {
      folder: Property.ShortText({
        displayName: 'Folder ID',
        description:
          'The Google Cloud Platform folder ID to use for this invocation.',
        required: true,
      }),
    };
  }

  const scopeConfigs = {
    billingAccount: {
      command: 'gcloud billing accounts list',
      extractLabelAndValue: (item: { name: string; displayName: string }) => ({
        label: item.displayName,
        value: item.name.split('/')[1],
      }),
      displayName: 'Billing Account',
      description:
        'The Google Cloud Platform billing account ID to use for this invocation.',
    },
    organization: {
      command: 'gcloud organizations list',
      extractLabelAndValue: (item: { name: string; displayName: string }) => ({
        label: item.displayName,
        value: item.name.split('/')[1],
      }),
      displayName: 'Organization ID',
      description:
        'The Google Cloud Platform organization ID to use for this invocation.',
    },
    project: {
      command: 'gcloud projects list',
      extractLabelAndValue: (item: { name: string; projectId: string }) => ({
        label: item.name,
        value: item.projectId,
      }),
      displayName: 'Project ID',
      description: 'The Google Cloud Platform project ID.',
    },
  };

  const config = scopeConfigs[filterSelection as keyof typeof scopeConfigs];
  if (!config) return {};

  try {
    const result = await runCommand(
      `${config.command} --format=json`,
      auth,
      useHostSession,
    );
    const parsedItems = JSON.parse(result ?? '[]');

    return {
      [filterSelection]: Property.StaticDropdown({
        displayName: config.displayName,
        description: config.description,
        required: true,
        options: {
          disabled: false,
          options: parsedItems.map(config.extractLabelAndValue),
        },
      }),
    };
  } catch (error) {
    return {
      [filterSelection]: Property.StaticDropdown({
        displayName: config.displayName,
        description: config.description,
        required: true,
        options: {
          disabled: true,
          options: [],
          placeholder: `Error fetching ${filterSelection}s`,
          error: `${error}`,
        },
      }),
    };
  }
}

function getRecommendersDropdown() {
  const blockedRecommenders = new Set([
    'google.accounts.security.SecurityKeyRecommender',
    'google.bigquery.jobs.ErrorMitigationRecommender',
    'google.cloudbilling.commitment.SpendBasedCommitmentRecommender',
    'google.cloudplatform.productledgrowth.Recommender',
    'google.composer.environment.Recommender',
    'google.di.productx.Recommender',
  ]);

  return Property.MultiSelectDropdown({
    displayName: 'Recommender',
    description:
      'The Google Cloud Platform recommenders to use for this invocation.',
    required: true,
    refreshers: [
      'auth',
      'useHostSession',
      'useHostSession.useHostSessionCheckbox',
    ],
    options: async ({ auth, useHostSession }) => {
      const shouldUseHostCredentials =
        (useHostSession as { useHostSessionCheckbox?: boolean })
          ?.useHostSessionCheckbox === true;

      if (!auth && !shouldUseHostCredentials) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please authenticate to see recommenders.',
          error: undefined,
        };
      }

      try {
        const output = await runCommand(
          `gcloud beta recommender recommenders list --format=json`,
          auth,
          shouldUseHostCredentials,
        );
        const recommenders: { name: string }[] = JSON.parse(output ?? '[]');

        return {
          disabled: false,
          options: recommenders
            .filter(({ name }) => !blockedRecommenders.has(name))
            .map(({ name }) => ({
              label: name,
              value: name,
            })),
        };
      } catch (error) {
        return {
          disabled: true,
          options: [],
          placeholder: `Error fetching recommenders`,
          error: `${error}`,
        };
      }
    },
  });
}

function getFilterByPropertyCommandParam(filterByProperty: any) {
  if (filterByProperty?.['billingAccount']) {
    return `--billing-account=${filterByProperty['billingAccount']}`;
  } else if (filterByProperty?.['organization']) {
    return `--organization=${filterByProperty['organization']}`;
  } else if (filterByProperty?.['project']) {
    return `--project=${filterByProperty['project']}`;
  } else if (filterByProperty?.['folder']) {
    return `--folder=${filterByProperty['folder']}`;
  }

  throw new Error('One of the filters must be selected');
}
