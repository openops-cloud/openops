import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  DocumentOwner,
  generateBaseSSMRunbookExecutionLink,
  generateSSMRunbookExecutionParams,
  runbookNameProperty,
  runbookParametersProperty,
  runbookVersionProperty,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ssmGenerateRunbookLinkAction = createAction({
  auth: amazonAuth,
  name: 'ssm_generate_runbook_execution_link',
  description:
    'Generate an AWS Console link to execute an SSM Automation Runbook',
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
      defaultValue: DocumentOwner.Private,
    }),
    runbook: runbookNameProperty,
    version: runbookVersionProperty,
    parameters: runbookParametersProperty,
  },
  async run({ propsValue, auth }) {
    const { runbook, version, parameters, region } = propsValue;
    const awsRegion = region || auth.defaultRegion;

    if (!runbook) {
      throw new Error('Runbook is required');
    }

    const base = generateBaseSSMRunbookExecutionLink(
      awsRegion,
      runbook,
      version,
    );

    const fragment = generateSSMRunbookExecutionParams(
      (parameters as Record<string, unknown>) || {},
    );
    const link = `${base}${fragment}`;

    return {
      link,
    };
  },
});
