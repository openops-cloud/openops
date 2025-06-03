import { Type } from '@sinclair/typebox';
import { ValidationInputType } from '../../validators/types';
import {
  BasePropertySchema,
  TPropertyValue,
} from '../input/common';
import { PropertyType } from '../input/property-type';

export const SecretTextProperty = Type.Composite([
  BasePropertySchema,
  TPropertyValue(
    Type.Object({
      auth: Type.String(),
    }),
    PropertyType.SECRET_TEXT,
  ),
]);

export type SecretTextProperty<R extends boolean> = BasePropertySchema &
  TPropertyValue<
    string,
    PropertyType.SECRET_TEXT,
    ValidationInputType.STRING,
    R
  >;
