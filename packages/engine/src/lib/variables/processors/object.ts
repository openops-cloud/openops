import { tryParseJson } from '@openops/common';
import { ProcessorFn } from './types';

export const objectProcessor: ProcessorFn = (_property, value) => {
  if (typeof value === 'string') {
    return tryParseJson(value);
  }

  return value;
};
