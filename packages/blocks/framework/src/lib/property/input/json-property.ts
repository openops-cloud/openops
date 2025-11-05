import { Type } from '@sinclair/typebox';
import { ValidationInputType } from '../../validators/types';
import { BasePropertySchema, SupportsAISchema, TPropertyValue } from './common';
import { PropertyType } from './property-type';

export const JsonProperty = Type.Composite([
  SupportsAISchema,
  BasePropertySchema,
  TPropertyValue(
    Type.Union([Type.Record(Type.String(), Type.Unknown())]),
    PropertyType.JSON,
  ),
]);
export type JsonProperty<R extends boolean> = BasePropertySchema &
  SupportsAISchema &
  TPropertyValue<
    Record<string, unknown>,
    PropertyType.JSON,
    ValidationInputType.OBJECT,
    R
  >;
