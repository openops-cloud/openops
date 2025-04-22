import { Type } from '@sinclair/typebox';
import { ValidationInputType } from '../../validators/types';
import { BasePropertySchema, SupportsAISchema, TPropertyValue } from './common';
import { PropertyType } from './property-type';

export const ShortTextProperty = Type.Composite([
  BasePropertySchema,
  TPropertyValue(Type.String(), PropertyType.SHORT_TEXT),
]);

export type ShortTextProperty<R extends boolean> = BasePropertySchema &
  TPropertyValue<
    string,
    PropertyType.SHORT_TEXT,
    ValidationInputType.STRING,
    R
  >;

export const LongTextProperty = Type.Composite([
  SupportsAISchema,
  BasePropertySchema,
  TPropertyValue(Type.String(), PropertyType.LONG_TEXT),
]);

export type LongTextProperty<R extends boolean> = BasePropertySchema &
  SupportsAISchema &
  TPropertyValue<string, PropertyType.LONG_TEXT, ValidationInputType.STRING, R>;
