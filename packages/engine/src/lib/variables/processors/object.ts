import { tryParseJson } from '@openops/common';
import { ProcessorFn } from './types';

export const objectProcessor: ProcessorFn = (_property, value) => {
  return tryParseJson(value);
};
