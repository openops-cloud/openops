import { createAction, Property } from '@openops/blocks-framework';
import { finoutAuth } from '../auth';
import { getView, getViews } from '../common/views';

export const getViewDataAction = createAction({
  name: 'finout_get_view_data',
  displayName: 'Get View Data',
  description: 'Retrieve view data',
  auth: finoutAuth,
  isWriteAction: false,
  props: {
    viewId: Property.Dropdown({
      displayName: 'View',
      description: 'A list of available views',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }: any) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const views = await getViews(auth);

        return {
          disabled: false,
          options: views.map((view: any) => ({
            label: view.name,
            value: view.id,
          })),
        };
      },
    }),
  },
  async run(context) {
    return await getView(context.auth, context.propsValue.viewId);
  },
});
