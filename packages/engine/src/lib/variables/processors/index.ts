import { PropertyType } from '@openops/blocks-framework';
import { dateTimeProcessor } from './date-time';
import { fileProcessor } from './file';
import { jsonProcessor } from './json';
import { numberProcessor } from './number';
import { textProcessor } from './text';
import { ProcessorFn } from './types';

export const processors: Partial<Record<PropertyType, ProcessorFn>> = {
  JSON: jsonProcessor,
  NUMBER: numberProcessor,
  LONG_TEXT: textProcessor,
  SHORT_TEXT: textProcessor,
  SECRET_TEXT: textProcessor,
  DATE_TIME: dateTimeProcessor,
  FILE: fileProcessor,
};
