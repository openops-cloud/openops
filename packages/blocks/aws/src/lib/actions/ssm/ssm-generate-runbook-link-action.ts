import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  runbookNameProperty,
  runbookParametersProperty,
  runbookVersionProperty,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ssmGenerateRunbookLinkAction = createAction({
  auth: amazonAuth,
  name: 'ssm_generate_runbook_execution_link',
  description:
    'Generate an AWS Console link to execute an SSM Automation Runbook, with optional prefilled parameters.',
  displayName: 'Generate Runbook Execution Link',
  isWriteAction: false,
  riskLevel: RiskLevel.LOW,
  props: {
    region: Property.ShortText({
      displayName: 'Region',
      description: 'AWS region (defaults to the region from authentication).',
      required: false,
    }),
    owner: Property.StaticDropdown({
      displayName: 'Owner',
      description: 'Source/owner of the runbook (Automation document).',
      required: true,
      options: {
        options: [
          { label: 'Owned by Amazon', value: 'Amazon' },
          { label: 'Owned by me', value: 'Self' },
          { label: 'Shared with me', value: 'Private' },
          { label: 'Public', value: 'Public' },
          { label: 'Third Party', value: 'ThirdParty' },
          { label: 'All runbooks', value: 'All' },
        ],
      },
      defaultValue: 'Private',
    }),
    runbook: runbookNameProperty,
    version: runbookVersionProperty,
    parameters: runbookParametersProperty,
  },
  async run({ propsValue, auth }) {
    const awsRegion = (propsValue.region ||
      auth.defaultRegion) as unknown as string;
    const runbook = String(propsValue.runbook);

    if (!runbook) {
      throw new Error('Runbook is required');
    }

    const version = propsValue.version ?? undefined;

    const base = `https://${awsRegion}.console.aws.amazon.com/systems-manager/automation/execute/${encodeURIComponent(
      runbook,
    )}?region=${encodeURIComponent(awsRegion)}${
      version ? `&documentVersion=${encodeURIComponent(version)}` : ''
    }`;

    const inputParams =
      (propsValue.parameters as Record<string, unknown>) || {};
    const entries = Object.entries(inputParams || {});

    const hashParts: string[] = [];
    for (const [key, value] of entries) {
      if (value === undefined || value === null) continue;

      let encodedValue: string | undefined;
      if (Array.isArray(value)) {
        const joined = value
          .map((v) => (v === undefined || v === null ? '' : String(v)))
          .filter((s) => s.length > 0)
          .join(', ');
        if (joined.length) {
          encodedValue = encodeURIComponent(joined);
        }
      } else if (typeof value === 'object') {
        try {
          encodedValue = encodeURIComponent(JSON.stringify(value));
        } catch {
          // Fallback to string coercion
          encodedValue = encodeURIComponent(String(value));
        }
      } else if (
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        typeof value === 'string'
      ) {
        const s = String(value);
        if (s.length) {
          encodedValue = encodeURIComponent(s);
        }
      }

      if (encodedValue) {
        hashParts.push(`${encodeURIComponent(String(key))}=${encodedValue}`);
      }
    }

    const fragment = hashParts.length ? `#${hashParts.join('&')}` : '';
    const link = `${base}${fragment}`;

    return {
      link,
    };
  },
});
