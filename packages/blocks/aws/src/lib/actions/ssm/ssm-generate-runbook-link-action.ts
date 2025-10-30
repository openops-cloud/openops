import {
  DescribeDocumentCommand,
  DescribeDocumentRequest,
  DocumentIdentifier,
  DocumentKeyValuesFilter,
  DocumentVersionInfo,
  ListDocumentsCommand,
  ListDocumentVersionsCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  getCredentialsForAccount,
  makeAwsRequest,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

function resolveRegion(context: any): string {
  const region = context.propsValue.region || context.auth?.defaultRegion;
  if (!region || typeof region !== 'string') {
    throw new Error(
      'AWS region is required. Please set it on the block auth or provide it explicitly.',
    );
  }
  return region;
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
          { label: 'Owned by Amazon', value: 'Amazon' },
          { label: 'Owned by me', value: 'Self' },
          { label: 'Shared with me', value: 'Private' },
          { label: 'Public', value: 'Public' },
          { label: 'Third Party', value: 'ThirdParty' },
          { label: 'All runbooks', value: 'All' },
        ],
      },
      defaultValue: 'Self',
    }),
    runbook: Property.Dropdown({
      displayName: 'Runbook',
      description: 'Select an SSM Automation document (runbook).',
      required: true,
      refreshers: ['auth', 'owner', 'region'],
      options: async (props, ctx) => {
        const auth = (ctx as any).auth || props['auth'];
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const region = props['region'] || (auth as any).defaultRegion;
        if (!region) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please provide a region',
          };
        }

        try {
          const credentials = await getCredentialsForAccount(auth);
          const client = new SSMClient({
            region: String(region),
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
          });

          const filters: DocumentKeyValuesFilter[] = [
            { Key: 'DocumentType', Values: ['Automation'] },
          ];

          const ownerValue = props['owner'] as string;

          if (ownerValue !== 'All') {
            filters.push({ Key: 'Owner', Values: [ownerValue] });
          }

          const command = new ListDocumentsCommand({
            Filters: filters,
          });

          const pages = await makeAwsRequest(client, command);

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
      options: async (props, ctx) => {
        const auth = (ctx as any).auth || props['auth'];
        const runbookName = props['runbook'] as unknown as string;
        const region = props['region'] || (auth as any)?.defaultRegion;

        if (!auth || !runbookName || !region) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Select runbook first',
          };
        }

        try {
          const credentials = await getCredentialsForAccount(auth);
          const client = new SSMClient({
            region: String(region),
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
          });

          const command = new ListDocumentVersionsCommand({
            Name: runbookName,
            MaxResults: 50,
          }) as any;

          const pages = (await makeAwsRequest(client as any, command)) as any[];

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
      props: async (props, ctx) => {
        const result: Record<string, any> = {};

        const auth = (ctx as any).auth || props['auth'];
        const runbookName = props['runbook'] as unknown as string;
        const region = props['region'] || (auth as any)?.defaultRegion;

        if (!auth || !runbookName || !region) {
          return result;
        }

        try {
          const credentials = await getCredentialsForAccount(auth);
          const client = new SSMClient({
            region: String(region),
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
          });

          const filters: DescribeDocumentRequest = { Name: runbookName };

          if (props['version']) {
            filters.DocumentVersion = props['version'] as unknown as string;
          }

          const resp = await client.send(new DescribeDocumentCommand(filters));

          const doc: any = resp as any;

          const parameters =
            doc.Document?.Parameters ||
            doc.DocumentDescription?.Parameters ||
            [];

          for (const p of parameters) {
            const key = p?.Name as string;
            if (!key) continue;

            const type = String(p?.Type || '').toLowerCase();
            const desc = p?.Description || undefined;
            const def = p?.DefaultValue;

            const parseJson = (val: any) => {
              if (val === undefined || val === null || val === '')
                return undefined;
              if (typeof val !== 'string') return val as any;
              try {
                return JSON.parse(val);
              } catch {
                return undefined;
              }
            };

            if (type.includes('list') && type !== 'maplist') {
              const toArray = (val: any): unknown[] | undefined => {
                if (val === undefined || val === null || val === '')
                  return undefined;
                if (Array.isArray(val)) return val as unknown[];
                if (typeof val === 'string') {
                  try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) return parsed as unknown[];
                  } catch {}
                  const parts = val
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  return parts.length ? parts : undefined;
                }
                return undefined;
              };

              const defaultArr = toArray(def);
              result[key] = Property.Array({
                displayName: key,
                required: false,
                description: desc,
                defaultValue: Array.isArray(defaultArr)
                  ? defaultArr
                  : undefined,
              });
              continue;
            }

            switch (type) {
              case 'stringlist': {
                const defaultArr = parseJson(def) as string[] | undefined;
                result[key] = Property.Array({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue: Array.isArray(defaultArr)
                    ? defaultArr
                    : undefined,
                });
                break;
              }
              case 'integer': {
                const n = typeof def === 'number' ? def : Number(def);
                result[key] = Property.Number({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue: Number.isFinite(n) ? (n as number) : undefined,
                });
                break;
              }
              case 'boolean': {
                const b =
                  typeof def === 'boolean'
                    ? def
                    : String(def).toLowerCase() === 'true';
                result[key] = Property.Checkbox({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue: typeof b === 'boolean' ? b : undefined,
                });
                break;
              }
              case 'stringmap': {
                const obj = parseJson(def) as
                  | Record<string, unknown>
                  | undefined;
                console.log('THE OBJ IS', obj);

                result[key] = Property.Object({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue:
                    obj && typeof obj === 'object' && !Array.isArray(obj)
                      ? obj
                      : undefined,
                });
                break;
              }
              case 'maplist': {
                const val = parseJson(def) as unknown;
                result[key] = Property.Json({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue:
                    val && typeof val === 'object'
                      ? (val as object)
                      : undefined,
                });
                break;
              }
              default: {
                result[key] = Property.ShortText({
                  displayName: key,
                  required: false,
                  description: desc,
                  defaultValue: def ? String(def) : undefined,
                });
              }
            }
          }
        } catch (e) {
          console.log('THE ERROR IS', e);
        }

        return result;
      },
    }),
  },
  async run(context) {
    const region = resolveRegion(context);
    const owner = String(context.propsValue.owner || 'Self');
    const runbook = String(context.propsValue.runbook);

    if (!runbook) {
      throw new Error('Runbook is required');
    }

    const version = context.propsValue.version
      ? String(context.propsValue.version)
      : undefined;

    const base = `https://${region}.console.aws.amazon.com/systems-manager/automation/execute/${encodeURIComponent(
      runbook,
    )}?region=${encodeURIComponent(region)}${
      version ? `&documentVersion=${encodeURIComponent(version)}` : ''
    }`;

    const inputParams =
      (context.propsValue.parameters as Record<string, unknown>) || {};
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
      metadata: {
        region,
        owner,
        runbook,
        parameters: inputParams,
      },
    };
  },
});
