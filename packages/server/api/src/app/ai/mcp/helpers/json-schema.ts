import { z } from 'zod';

/**
 * Recursively converts a JSON Schema (draft 4+) object to a Zod schema
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') return z.any();

  const {
    type,
    format,
    nullable,
    enum: enumVals,
    items,
    properties,
    required,
  } = schema;

  if (enumVals) {
    const zodEnum = z.enum(enumVals);
    return nullable ? zodEnum.nullable() : zodEnum;
  }

  let base: z.ZodTypeAny;

  switch (type) {
    case 'string':
      base = format === 'date-time' ? z.string().datetime() : z.string();
      break;
    case 'integer':
      base = z.number().int();
      break;
    case 'number':
      base = z.number();
      break;
    case 'boolean':
      base = z.boolean();
      break;
    case 'array':
      base = z.array(items ? jsonSchemaToZod(items) : z.any());
      break;
    case 'object': {
      const shape: Record<string, z.ZodTypeAny> = {};
      const props = properties ?? {};
      const req = new Set(required ?? []);

      for (const [key, propSchema] of Object.entries(props)) {
        let child = jsonSchemaToZod(propSchema);
        if (!req.has(key)) child = child.optional();
        shape[key] = child;
      }

      base = z.object(shape);
      break;
    }
    default:
      base = z.any();
  }

  return nullable ? base.nullable() : base;
}
