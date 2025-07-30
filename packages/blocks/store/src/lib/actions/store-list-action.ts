import { createAction, Property } from '@openops/blocks-framework';
import { BlockStoreScope, common, getScopeAndKey } from './common';

export const storageListAction = createAction({
  name: 'list',
  displayName: 'List',
  description:
    'List all keys and their values in storage with optional filtering.',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  props: {
    keyFilter: Property.ShortText({
      displayName: 'Key filter',
      description:
        'Regex pattern to filter keys (optional). Leave empty to return all keys.',
      required: false,
    }),
    store_scope: common.store_scope,
  },
  async run(context) {
    const { scope, key: keyPrefix } = getScopeAndKey({
      runId: context.run.id,
      isTest: context.run.isTest,
      key: '',
      scope: context.propsValue.store_scope,
    });

    const keyFilter = context.propsValue.keyFilter;
    let filterRegex: RegExp | null = null;

    if (keyFilter && keyFilter.trim() !== '') {
      try {
        filterRegex = new RegExp(keyFilter);
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${keyFilter}`);
      }
    }

    const entries = await context.store.list(scope);

    // Filter entries based on scope and key filter
    let filteredEntries = entries;

    // For RUN scope, we need to filter to only include entries with the run prefix
    if (context.propsValue.store_scope === BlockStoreScope.RUN && keyPrefix) {
      filteredEntries = entries.filter((entry) =>
        entry.key.startsWith(keyPrefix),
      );
    }

    if (filterRegex) {
      return filteredEntries.filter((entry) => {
        let keyName = entry.key;

        // Remove the run prefix for RUN scope when applying user filter
        if (
          context.propsValue.store_scope === BlockStoreScope.RUN &&
          keyPrefix
        ) {
          keyName = entry.key.replace(keyPrefix, '');
        }

        // For test runs, also remove the test-run prefix
        if (context.run.isTest) {
          keyName = keyName.replace(/^run_test-run\//, '');
        }

        return filterRegex?.test(keyName);
      });
    }

    return filteredEntries;
  },
});
