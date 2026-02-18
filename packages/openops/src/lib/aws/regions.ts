import { DropdownState, Property } from '@openops/blocks-framework';
import { convertToStringArrayWithValidation } from '@openops/shared';
import { parseArn } from './arn-handler';

const staticRegions = {
  'us-east-1 (US East (N. Virginia))': 'us-east-1',
  'us-east-2 (US East (Ohio))': 'us-east-2',
  'us-west-1 (US West (N. California))': 'us-west-1',
  'us-west-2 (US West (Oregon))': 'us-west-2',
  'af-south-1 (Africa (Cape Town))': 'af-south-1',
  'ap-east-1 (Asia Pacific (Hong Kong))': 'ap-east-1',
  'ap-south-1 (Asia Pacific (Mumbai))': 'ap-south-1',
  'ap-south-2 (Asia Pacific (Hyderabad))': 'ap-south-2',
  'ap-southeast-1 (Asia Pacific (Singapore))': 'ap-southeast-1',
  'ap-southeast-2 (Asia Pacific (Sydney))': 'ap-southeast-2',
  'ap-southeast-3 (Asia Pacific (Jakarta))': 'ap-southeast-3',
  'ap-southeast-4 (Asia Pacific (Melbourne))': 'ap-southeast-4',
  'ap-southeast-5 (Asia Pacific (Malaysia))': 'ap-southeast-5',
  'ap-southeast-7 (Asia Pacific (Thailand))': 'ap-southeast-7',
  'ap-northeast-1 (Asia Pacific (Tokyo))': 'ap-northeast-1',
  'ap-northeast-2 (Asia Pacific (Seoul))': 'ap-northeast-2',
  'ap-northeast-3 (Asia Pacific (Osaka))': 'ap-northeast-3',
  'ca-central-1 (Canada (Central))': 'ca-central-1',
  'ca-west-1 (Canada West (Calgary))': 'ca-west-1',
  'eu-central-1 (Europe (Frankfurt))': 'eu-central-1',
  'eu-central-2 (Europe (Zurich))': 'eu-central-2',
  'eu-west-1 (Europe (Ireland))': 'eu-west-1',
  'eu-west-2 (Europe (London))': 'eu-west-2',
  'eu-west-3 (Europe (Paris))': 'eu-west-3',
  'eu-south-1 (Europe (Milan))': 'eu-south-1',
  'eu-south-2 (Europe (Spain))': 'eu-south-2',
  'eu-north-1 (Europe (Stockholm))': 'eu-north-1',
  'il-central-1 (Israel (Tel Aviv))': 'il-central-1',
  'mx-central-1 (Mexico (Central))': 'mx-central-1',
  'me-south-1 (Middle East (Bahrain))': 'me-south-1',
  'me-central-1 (Middle East (UAE))': 'me-central-1',
  'sa-east-1 (South America (São Paulo))': 'sa-east-1',
};

export type RegionListItem = {
  id: string;
  displayName: string;
};

export function getRegionsList(): RegionListItem[] {
  return Object.entries(staticRegions).map(([label, id]) => {
    const part = label.includes(' ')
      ? label.slice(label.indexOf(' ') + 1)
      : label;
    const displayName =
      part.startsWith('(') && part.endsWith(')') ? part.slice(1, -1) : part;
    return { id, displayName };
  });
}

export function getRegionsDropdownState(): DropdownState<string> {
  return {
    disabled: false,
    options: Object.entries(staticRegions).map(([label, value]) => ({
      label,
      value,
    })),
  } as DropdownState<string>;
}

export function regionsStaticMultiSelectDropdown(required: boolean): any {
  return {
    regions: Property.StaticMultiSelectDropdown({
      displayName: 'Regions',
      description: 'A list of AWS regions.',
      required: required,
      options: getRegionsDropdownState(),
    }),
  };
}

export function groupARNsByRegion(arns: string[]): Record<string, string[]> {
  const record: Record<string, string[]> = {};

  for (const arn of arns) {
    const { region } = parseArn(arn);

    if (region in record) {
      record[region].push(arn);
    } else {
      record[region] = [arn];
    }
  }

  return record;
}

export function convertToRegionsArrayWithValidation(
  input: any,
): [string, ...string[]] {
  return convertToStringArrayWithValidation(
    input,
    'Input should be a single region or an array of regions',
  );
}
