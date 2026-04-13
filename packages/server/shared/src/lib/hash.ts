import * as crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

function hashObject(
  object: object,
  replacer?: (key: string, value: unknown) => unknown,
): string {
  const jsonString = JSON.stringify(object, replacer);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

function hashDeterministicObject(object: object): string {
  const jsonString = stringify(object);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

export const hashUtils = {
  hashObject,
  hashDeterministicObject,
};
