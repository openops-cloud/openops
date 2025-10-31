import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { amazonAuth } from '../auth';
import { getSsmDescribeDocumentInfo } from './get-ssm-describe-document-info';

export const runbookParametersProperty = Property.DynamicProperties({
  displayName: 'Parameters',
  required: true,
  refreshers: ['auth', 'region', 'runbook', 'version'],
  props: async ({ auth, region, runbook, version }) => {
    const result: Record<string, any> = {};

    const awsAuth = auth as BlockPropValueSchema<typeof amazonAuth>;
    const runbookName = runbook as unknown as string;
    const awsRegion = (region || awsAuth.defaultRegion) as unknown as string;

    if (!awsAuth || !runbookName || !awsRegion) {
      return result;
    }

    try {
      const parameters = await getSsmDescribeDocumentInfo({
        auth: awsAuth,
        region: awsRegion,
        version: version as unknown as string,
        runbookName,
      });

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
});
