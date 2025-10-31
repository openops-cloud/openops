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

function safeParseDefault(raw?: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    logger.warn(
      'Failed to parse AWS Document default input value, error is ',
      error,
    );
    return undefined;
  }
}

function isListType(type: string): boolean {
  return /^List<[^>]+>$/.test(type) || type === ParameterType.StringList;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function coerceNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  const b =
    typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true';
  return typeof b === 'boolean' ? b : undefined;
}

function createPropertyForParam(p: any, type: string, defaultValue: unknown) {
  const key = p.Name as string;
  const base = {
    displayName: key,
    required: false,
    description: p?.Description,
  } as const;

  if (isListType(type)) {
    return Property.Array({
      ...base,
      defaultValue: Array.isArray(defaultValue)
        ? (defaultValue as unknown[])
        : undefined,
    });
  }

  switch (type) {
    case ParameterType.Integer:
      return Property.Number({
        ...base,
        defaultValue: coerceNumber(defaultValue),
      });

    case ParameterType.Boolean:
      return Property.Checkbox({
        ...base,
        defaultValue: coerceBoolean(defaultValue),
      });

    case ParameterType.StringMap:
      return Property.Object({
        ...base,
        defaultValue: isPlainObject(defaultValue) ? defaultValue : undefined,
      });

    case ParameterType.MapList:
      return Property.Json({
        ...base,
        defaultValue: defaultValue ?? [],
      });

    default:
      return Property.ShortText({
        ...base,
        defaultValue: defaultValue ? JSON.stringify(defaultValue) : undefined,
      });
  }
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
        const key = p?.Name as string | undefined;
        if (!key) continue;

        const type = String(p?.Type || '');
        const defaultValue = safeParseDefault(p?.DefaultValue);

        result[key] = createPropertyForParam(p, type, defaultValue);
      }
    } catch (e) {
      logger.warn(e);
    }

    return result;
  },
});
