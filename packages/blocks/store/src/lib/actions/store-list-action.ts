import { createAction, Property } from '@openops/blocks-framework';
import { common, getScopeAndKey } from './common';

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
    const { scope } = getScopeAndKey({
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

    if (filterRegex) {
      return entries.filter((entry) => {
        let keyName = entry.key;
        if (context.run.isTest) {
          keyName = entry.key.replace(/^run_test-run\//, '');
        }
        return filterRegex?.test(keyName);
      });
    }

    return entries;
  },
});
