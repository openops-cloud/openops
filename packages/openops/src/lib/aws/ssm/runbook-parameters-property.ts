import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { amazonAuth } from '../auth';
import { getSsmDescribeDocumentInfo } from './get-ssm-describe-document-info';

const enum ParameterType {
  String = 'String',
  StringList = 'StringList',
  Integer = 'Integer',
  Boolean = 'Boolean',
  StringMap = 'StringMap',
  MapList = 'MapList',
}

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

        if (/^List<[^>]+>$/.test(type) || type === ParameterType.StringList) {
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
          case ParameterType.Integer: {
            const n =
              typeof defaultValue === 'number'
                ? defaultValue
                : Number(defaultValue);
            result[key] = Property.Number({
              displayName: key,
              required: false,
              description: p?.Description,
              defaultValue: Number.isFinite(n) ? n : undefined,
            });
            break;
          }
          case ParameterType.Boolean: {
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
          case ParameterType.StringMap: {
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
          case ParameterType.MapList: {
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
