import { createAction, Property, Validators } from '@openops/blocks-framework';
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
  },
  async run(context) {
    const { key, scope } = getScopeAndKey({
      runId: context.run.id,
      key: context.propsValue['key'],
      scope: context.propsValue.store_scope,
    });
    return (
      (await context.store.get(key, scope)) ??
      context.propsValue['defaultValue']
    );
  },
});
