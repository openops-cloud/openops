import { createAction, Property, Validators } from '@openops/blocks-framework';
import { tryParseJson } from '@openops/common';
import { common, getScopeAndKey } from './common';

export const storageGetAction = createAction({
  name: 'get',
  displayName: 'Get',
  description: 'Get a value from storage',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  isWriteAction: false,
  props: {
    key: Property.ShortText({
      displayName: 'Key',
      required: true,
      validators: [Validators.maxLength(128)],
    }),
    defaultValue: Property.ShortText({
      displayName: 'Default Value',
      required: false,
    }),
    store_scope: common.store_scope,
    parseJSON: Property.Checkbox({
      displayName: 'Parse as JSON',
      description: 'Convert output into a JSON object',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { key, scope } = getScopeAndKey({
      runId: context.run.id,
      isTest: context.run.isTest,
      key: context.propsValue['key'],
      scope: context.propsValue.store_scope,
    });

    const value =
      (await context.store.get(key, scope)) ??
      context.propsValue['defaultValue'];

    if (context.propsValue['parseJSON']) {
      return tryParseJson(value);
    }

    return value;
  },
});
