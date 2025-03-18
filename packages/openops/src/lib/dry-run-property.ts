import { Property } from '@openops/blocks-framework';

export function dryRunCheckBox(): any {
  return Property.Checkbox({
    displayName: 'Dry Run',
    description: 'Run the operation in dry run mode',
    required: false,
  });
}
