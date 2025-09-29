import { tryParseJson } from '@openops/common';
import { z, ZodError, ZodObject } from 'zod';

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

function issuesToRecord(err: ZodError, rootKey = '$'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join('.') : rootKey;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function schemaValidation<TSchema extends ZodObject<any>>(
  schema: TSchema,
  obj: unknown,
): ValidationSuccess<z.output<TSchema>> {
  let parsedObject = obj;
  if (typeof obj === 'string') {
    parsedObject = tryParseJson(obj);
  }

  const result = schema.safeParse(parsedObject);

  if (result.success) {
    return {
      success: result.success,
      data: result.data,
    };
  }

  throw new Error(
    JSON.stringify({ errors: issuesToRecord(result.error) }, null, 2),
  );
}
