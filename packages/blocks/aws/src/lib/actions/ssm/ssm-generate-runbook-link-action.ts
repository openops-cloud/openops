import {
  DescribeDocumentCommand,
  DescribeDocumentCommandOutput,
  DescribeDocumentRequest,
  DocumentIdentifier,
  DocumentKeyValuesFilter,
  DocumentVersionInfo,
  ListDocumentsCommand,
  ListDocumentsCommandOutput,
  ListDocumentVersionsCommand,
  ListDocumentVersionsResult,
  SSMClient,
} from '@aws-sdk/client-ssm';
import {
  BlockPropValueSchema,
  createAction,
  Property,
} from '@openops/blocks-framework';
import {
  amazonAuth,
  getAwsClient,
  getCredentialsForAccount,
  makeAwsRequest,
} from '@openops/common';
import { logger } from '@openops/server-shared';
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
    runbook: Property.Dropdown({
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
          const credentials = await getCredentialsForAccount(awsAuth);
          const client = getAwsClient(SSMClient, credentials, awsRegion);

          const filters: DocumentKeyValuesFilter[] = [
            { Key: 'DocumentType', Values: ['Automation'] },
          ];

          if (owner !== 'All') {
            filters.push({ Key: 'Owner', Values: [owner as string] });
          }

          const command = new ListDocumentsCommand({
            Filters: filters,
          });

          const pages = (await makeAwsRequest(
            client,
            command,
          )) as ListDocumentsCommandOutput[];

          const docs: DocumentIdentifier[] = pages.flatMap(
            (p) => p.DocumentIdentifiers || [],
          );

          if (!docs.length) {
            return {
              disabled: true,
              options: [],
              placeholder: 'No runbooks found',
            };
          }

          return {
            disabled: false,
            options: docs.map((d: DocumentIdentifier) => ({
              label: d.Name || d.DocumentVersion || 'Unknown',
              value: d.Name,
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
    }),
    version: Property.Dropdown({
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
          const credentials = await getCredentialsForAccount(awsAuth);
          const client = getAwsClient(SSMClient, credentials, awsRegion);

          const command = new ListDocumentVersionsCommand({
            Name: runbookName,
          });

          const pages = (await makeAwsRequest(
            client,
            command,
          )) as ListDocumentVersionsResult[];

          const versions: DocumentVersionInfo[] = pages.flatMap(
            (p) => p.DocumentVersions || [],
          );

          if (!versions.length) {
            return {
              disabled: false,
              options: [],
              placeholder: 'No versions found (default will be used)',
            };
          }

          const opts = versions.map((v) => {
            const ver = v.DocumentVersion || '';
            const name = v.VersionName ? ` - ${v.VersionName}` : '';
            const def = v.IsDefaultVersion ? ' (default)' : '';
            return { label: `${ver}${name}${def}`, value: ver };
          });

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
    }),
    parameters: Property.DynamicProperties({
      displayName: 'Parameters',
      description:
        'Key-value parameters for the runbook. Keys may be prefilled based on the selected runbook.',
      required: true,
      refreshers: ['auth', 'owner', 'region', 'runbook', 'version'],
      props: async ({ auth, region, runbook, version }) => {
        const result: Record<string, any> = {};

        const awsAuth = auth as BlockPropValueSchema<typeof amazonAuth>;
        const runbookName = runbook as unknown as string;
        const awsRegion = (region ||
          awsAuth.defaultRegion) as unknown as string;

        if (!awsAuth || !runbookName || !awsRegion) {
          return result;
        }

        try {
          const credentials = await getCredentialsForAccount(awsAuth);
          const client = getAwsClient(SSMClient, credentials, awsRegion);

          const filters: DescribeDocumentRequest = { Name: runbookName };

          if (version) {
            filters.DocumentVersion = version as unknown as string;
          }

          const doc = (await client.send(
            new DescribeDocumentCommand(filters),
          )) as DescribeDocumentCommandOutput;

          const parameters = doc.Document?.Parameters || [];

          for (const p of parameters) {
            const key = p.Name;
            if (!key) continue;

            const type = String(p?.Type || '');
            let defaultValue: unknown;

            try {
              if (p?.DefaultValue) {
                defaultValue = JSON.parse(p.DefaultValue);
              }
            } catch (error) {
              logger.warn(
                'Failed to parse AWS Document default input value, error is ',
                error,
              );
            }

            if (/^List<[^>]+>$/.test(type) || type === 'StringList') {
              result[key] = Property.Array({
                displayName: key,
                required: false,
                description: p?.Description,
                defaultValue: Array.isArray(defaultValue)
                  ? defaultValue
                  : undefined,
              });
              continue;
            }

            switch (type) {
              case 'Integer': {
                const n =
                  typeof defaultValue === 'number'
                    ? defaultValue
                    : Number(defaultValue);
                result[key] = Property.Number({
                  displayName: key,
                  required: false,
                  description: p?.Description,
                  defaultValue: Number.isFinite(n) ? (n as number) : undefined,
                });
                break;
              }
              case 'Boolean': {
                const b =
                  typeof defaultValue === 'boolean'
                    ? defaultValue
                    : String(defaultValue).toLowerCase() === 'true';
                result[key] = Property.Checkbox({
                  displayName: key,
                  required: false,
                  description: p?.Description,
                  defaultValue: typeof b === 'boolean' ? b : undefined,
                });
                break;
              }
              case 'StringMap': {
                result[key] = Property.Object({
                  displayName: key,
                  required: false,
                  description: p?.Description,
                  defaultValue:
                    defaultValue &&
                    typeof defaultValue === 'object' &&
                    !Array.isArray(defaultValue)
                      ? defaultValue
                      : undefined,
                });
                break;
              }
              case 'MapList': {
                result[key] = Property.Json({
                  displayName: key,
                  required: false,
                  description: p?.Description,
                  defaultValue: defaultValue ?? [],
                });
                break;
              }
              default: {
                result[key] = Property.ShortText({
                  displayName: key,
                  required: false,
                  description: p?.Description,
                  defaultValue: defaultValue ? String(defaultValue) : undefined,
                });
              }
            }
          }
        } catch (e) {
          logger.warn(e);
        }

        return result;
      },
    }),
  },
  async run({ propsValue, auth }) {
    const awsRegion = (propsValue.region ||
      auth.defaultRegion) as unknown as string;
    const runbook = String(propsValue.runbook);

    if (!runbook) {
      throw new Error('Runbook is required');
    }

    const version = propsValue.version ? String(propsValue.version) : undefined;

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
