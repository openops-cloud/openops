import { Type } from '@sinclair/typebox';
import { ValidationInputType } from '../../validators/types';
import { TPropertyValue } from '../input/common';
import { PropertyType } from '../input/property-type';
import { BaseBlockAuthSchema } from './common';

export const SecretProperty = Type.Composite([
  BaseBlockAuthSchema,
  TPropertyValue(
    Type.Object({
      auth: Type.String(),
    }),
    PropertyType.SECRET_TEXT,
  ),
]);

export type SecretProperty<R extends boolean> = BaseBlockAuthSchema<string> &
  TPropertyValue<
    string,
    PropertyType.SECRET_TEXT,
    ValidationInputType.STRING,
    R
  >;
