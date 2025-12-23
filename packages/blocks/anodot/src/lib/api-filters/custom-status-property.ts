import { Property } from '@openops/blocks-framework';
import { booleanProperty } from './property-helpers';

export function customStatusProperty() {
  return Property.DynamicProperties({
    displayName: 'Custom Status Properties',
    description:
      'User defined conditions as set in the "is open" and "user status" fields, with logical "and" between them',
    required: true,
    refreshers: ['statusFilter'],
    props: async ({ statusFilter }): Promise<{ [key: string]: any }> => {
      if (!statusFilter) {
        return {};
      }

      const statusFilterValue = statusFilter as unknown as any;
      if (statusFilterValue !== 'custom') {
        return {};
      }

      return {
        isOpen: booleanProperty(
          'Is Open',
          'True to return only open recommendations. False to return only closed.',
        ),
        done: booleanProperty(
          'Done',
          'True to return only recommendations that have this status.',
        ),
        excluded: booleanProperty(
          'Excluded',
          'True to return only recommendations that have this status.',
        ),
      };
    },
  });
}
