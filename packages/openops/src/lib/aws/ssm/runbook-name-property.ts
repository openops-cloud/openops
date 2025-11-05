import { DocumentIdentifier } from '@aws-sdk/client-ssm';
import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { amazonAuth } from '../auth';
import { DocumentOwner } from './document-owner';
import { getSsmDocuments } from './get-ssm-documents';

export const runbookNameProperty = Property.Dropdown({
  displayName: 'Runbook',
  description: 'Select an SSM Automation document (runbook).',
  required: true,
  refreshers: ['auth', 'owner', 'region'],
  options: async ({ auth, owner, region }) => {
    const awsAuth = auth as BlockPropValueSchema<typeof amazonAuth>;
    if (!awsAuth) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Please authenticate first',
      };
    }

    const awsRegion = (region || awsAuth.defaultRegion) as string;
    if (!awsRegion) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Please provide a region',
      };
    }

    try {
      const docs = await getSsmDocuments({
        auth: awsAuth,
        region: awsRegion,
        owner: owner as DocumentOwner,
      });

      return {
        disabled: false,
        options: docs
          .filter((d: DocumentIdentifier) => Boolean(d.Name))
          .map((d) => ({
            label: d.Name!,
            value: d.Name!,
          })),
      };
    } catch (error) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Failed to load runbooks',
        error: String(error),
      };
    }
  },
});
