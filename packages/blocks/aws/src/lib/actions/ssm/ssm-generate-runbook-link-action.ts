import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  DocumentOwner,
  runbookNameProperty,
  runbookParametersProperty,
  runbookVersionProperty,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

function encodeParamValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'string') {
    return encodeURIComponent(value);
  }

  if (Array.isArray(value)) {
    const allPrimitives = value.every(
      (v) =>
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean',
    );

    if (allPrimitives) {
      const joined = value
        .map((v) => (v === null || v === undefined ? '' : String(v)))
        .join(', ');
      return encodeURIComponent(joined);
    }

    return encodeURIComponent(JSON.stringify(value));
  }

  return encodeURIComponent(JSON.stringify(value));
}

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
          { label: 'Owned by Amazon', value: DocumentOwner.Amazon },
          { label: 'Owned by me', value: DocumentOwner.Self },
          { label: 'Shared with me', value: DocumentOwner.Private },
          { label: 'Public', value: DocumentOwner.Public },
          { label: 'Third Party', value: DocumentOwner.ThirdParty },
          { label: 'All runbooks', value: DocumentOwner.All },
        ],
      },
      defaultValue: 'Private',
    }),
    runbook: runbookNameProperty,
    version: runbookVersionProperty,
    parameters: runbookParametersProperty,
  },
  async run({ propsValue, auth }) {
    const awsRegion = propsValue.region || auth.defaultRegion;
    const runbook = propsValue.runbook;

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
      const encodedValue = encodeParamValue(value);
      if (encodedValue) {
        hashParts.push(`${encodeURIComponent(key)}=${encodedValue}`);
      }
    }

    const fragment = hashParts.length ? `#${hashParts.join('&')}` : '';
    const link = `${base}${fragment}`;

    return {
      link,
    };
  },
});
