import { DynamicPropsValue, Property } from '@openops/blocks-framework';
import { getARNsProperty } from './arn-handler';
import { getRegionsDropdownState } from './regions';

export function waitForProperties(): any {
  return {
    shouldWaitForOperation: Property.Checkbox({
      displayName: 'Should wait for operation to complete',
      description:
        'If enabled, the workflow will pause until the operation is complete',
      required: false,
    }),
    waitForTimeInSecondsProperty: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['shouldWaitForOperation'],
      props: async ({ shouldWaitForOperation }) => {
        if (!shouldWaitForOperation) {
          return {};
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {
          waitForTimeInSeconds: Property.Number({
            displayName: 'Wait time (seconds)',
            description:
              'Number of seconds to wait for the operation to complete before timing out',
            required: true,
          }),
        };
        return result;
      },
    }),
  };
}

export function filterByArnsOrRegionsProperties(
  arnLabel?: string,
  arnDescription?: string,
): any {
  return {
    filterByARNs: Property.Checkbox({
      displayName: 'Filter by Resource ARNs',
      description: `If enabled, only resources matching the arns will be fetched`,
      required: true,
      defaultValue: false,
    }),
    filterProperty: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['filterByARNs'],
      props: async ({ filterByARNs }) => {
        const props: DynamicPropsValue = {};
        if (!filterByARNs) {
          const dropdownState = getRegionsDropdownState();
          props['regions'] = Property.StaticMultiSelectDropdown({
            displayName: 'Regions',
            description: 'A list of AWS regions.',
            required: true,
            options: dropdownState,
          });

          return props;
        }

        props['arns'] = getARNsProperty(arnLabel, arnDescription);

        return props;
      },
    }),
  };
}
