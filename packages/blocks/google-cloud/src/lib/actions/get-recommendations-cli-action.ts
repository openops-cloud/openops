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
  description: 'Fetch the recommendations for the provided recommenders',
  displayName: 'Get Recommendations',
  props: {
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    filterBySelection: Property.Dropdown<any>({
      displayName: 'Choose filter',
      description:
        'Select whether to filter by billing account, folder ID, organization ID, or project ID.',
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
            placeholder: 'Please authenticate to see filters.',
          };
        }

        return {
          disabled: false,
          options: await getScopeOptions(auth, shouldUseHostCredentials),
        };
      },
    }),
    filterByProperty: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['filterBySelection'],
      props: async ({ filterBySelection }) => {
        if (!filterBySelection) {
          return {} as any;
        }
        return filterBySelection;
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
        (recommender: string) => `${baseCommand} --recommender=${recommender}`,
      );

      const results = await runCommands(
        commands,
        context.auth,
        context.propsValue.useHostSession?.['useHostSessionCheckbox'],
      );

      return results.map(tryParseJson);
    } catch (error) {
      handleCliError({
        provider: 'Google Cloud',
        command: currentCommand,
        error,
      });
    }
  },
});

async function getScopeOptions(auth: any, useHostSession: boolean) {
  const scopeConfigs = {
    billingAccount: {
      command: 'gcloud billing accounts list',
      extractLabelAndValue: (item: { name: string; displayName: string }) => ({
        label: item.displayName,
        value: item.name.split('/')[1],
      }),
      dropdown: createDropdown(
        'Billing Account',
        'The Google Cloud Platform billing account ID to use for this invocation.',
        true,
      ),
    },
    organization: {
      command: 'gcloud organizations list',
      extractLabelAndValue: (item: { name: string; displayName: string }) => ({
        label: item.displayName,
        value: item.name.split('/')[1],
      }),
      dropdown: createDropdown(
        'Organization ID',
        'The Google Cloud Platform organization ID to use for this invocation.',
        true,
      ),
    },
    project: {
      command: 'gcloud projects list',
      extractLabelAndValue: (item: { name: string; projectId: string }) => ({
        label: item.name,
        value: item.projectId,
      }),
      dropdown: createDropdown(
        'Project ID',
        'The Google Cloud Platform project ID.',
        true,
      ),
    },
  };

  const commands = Object.values(scopeConfigs).map(
    ({ command }) => `${command} --format=json`,
  );

  let results: string[] = [];
  try {
    results = await runCommands(commands, auth, useHostSession);
  } catch (error) {
    for (const key in scopeConfigs) {
      scopeConfigs[key as keyof typeof scopeConfigs].dropdown.options = {
        disabled: true,
        options: [],
        placeholder: `Error fetching ${key}s`,
        error: `${error}`,
      };
    }
    return getScopeOptionsReturnStructure({
      billingAccount: scopeConfigs.billingAccount.dropdown,
      organization: scopeConfigs.organization.dropdown,
      project: scopeConfigs.project.dropdown,
    });
  }

  Object.entries(scopeConfigs).forEach(([key, config], index) => {
    try {
      const parsedItems = JSON.parse(results[index] ?? '[]');
      config.dropdown.options = {
        disabled: false,
        options: parsedItems.map(config.extractLabelAndValue),
      };
    } catch (error) {
      config.dropdown.options = {
        disabled: true,
        options: [],
        placeholder: `Error parsing ${key} results`,
        error: `${error}`,
      };
    }
  });

  return getScopeOptionsReturnStructure({
    billingAccount: scopeConfigs.billingAccount.dropdown,
    organization: scopeConfigs.organization.dropdown,
    project: scopeConfigs.project.dropdown,
  });
}

function getScopeOptionsReturnStructure(dropdowns: Record<string, any>) {
  return [
    {
      label: 'Filter by Billing Account',
      value: { billingAccount: dropdowns['billingAccount'] },
    },
    {
      label: 'Filter by Organization ID',
      value: { organization: dropdowns['organization'] },
    },
    { label: 'Filter by Project ID', value: { project: dropdowns['project'] } },
    {
      label: 'Filter by Folder ID',
      value: {
        folder: Property.ShortText({
          displayName: 'Folder ID',
          description:
            'The Google Cloud Platform folder ID to use for this invocation.',
          required: true,
        }),
      },
    },
  ];
}

function createDropdown(
  displayName: string,
  description: string,
  required: boolean,
) {
  return Property.StaticDropdown({
    displayName,
    description,
    required,
    options: {
      options: [],
    },
  });
}

function getRecommendersDropdown() {
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
          options: recommenders.map(({ name }) => ({
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
