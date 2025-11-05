import { DocumentVersionInfo } from '@aws-sdk/client-ssm';
import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { amazonAuth } from '../auth';
import { getSsmDocumentVersions } from './get-ssm-document-versions';

export const runbookVersionProperty = Property.Dropdown({
  displayName: 'Runbook version',
  description:
    'Optional specific document version to execute (omit to use default).',
  required: false,
  refreshers: ['auth', 'region', 'runbook'],
  options: async ({ auth, region, runbook }) => {
    const awsAuth = auth as BlockPropValueSchema<typeof amazonAuth>;
    const runbookName = runbook as string;
    const awsRegion = (region || awsAuth.defaultRegion) as string;

    if (!awsAuth || !runbookName || !awsRegion) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Select runbook first',
      };
    }

    try {
      const versions: DocumentVersionInfo[] = await getSsmDocumentVersions({
        auth: awsAuth,
        region: awsRegion,
        runbookName,
      });

      const opts = versions
        .map((v) => {
          const ver = v.DocumentVersion || '';
          const name = v.VersionName ? ` - ${v.VersionName}` : '';
          const def = v.IsDefaultVersion ? ' (default)' : '';
          return { label: `${ver}${name}${def}`, value: ver };
        })
        .filter((option) => Boolean(option.label));

      return {
        disabled: false,
        options: opts,
        placeholder: 'Select version',
      };
    } catch (error) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Failed to load versions',
        error: String(error),
      };
    }
  },
});
