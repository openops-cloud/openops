import { Type } from '@sinclair/typebox';
import { FileProperty, StaticPropsValue } from '..';
import { ValidationInputType } from '../../validators/types';
import { ArrayProperty } from '../input/array-property';
import { CheckboxProperty } from '../input/checkbox-property';
import { TPropertyValue } from '../input/common';
import { StaticDropdownProperty } from '../input/dropdown/static-dropdown';
import { NumberProperty } from '../input/number-property';
import { PropertyType } from '../input/property-type';
import { LongTextProperty, ShortTextProperty } from '../input/text-property';
import { BaseBlockAuthSchema } from './common';
import { SecretTextProperty } from './secret-text-property';

const CustomAuthProps = Type.Record(
  Type.String(),
  Type.Union([
    ShortTextProperty,
    LongTextProperty,
    NumberProperty,
    CheckboxProperty,
    StaticDropdownProperty,
    ArrayProperty,
    FileProperty,
  ]),
);

export type CustomAuthProps = Record<
  string,
  | ShortTextProperty<boolean>
  | LongTextProperty<boolean>
  | SecretTextProperty<boolean>
  | NumberProperty<boolean>
  | StaticDropdownProperty<unknown, boolean>
  | CheckboxProperty<boolean>
  | ArrayProperty<boolean>
  | FileProperty<boolean>
>;

export const CustomAuthProperty = Type.Composite([
  BaseBlockAuthSchema,
  Type.Object({
    props: CustomAuthProps,
  }),
  TPropertyValue(Type.Unknown(), PropertyType.CUSTOM_AUTH),
]);

export type CustomAuthProperty<
  T extends CustomAuthProps,
  R extends boolean = true,
> = BaseBlockAuthSchema<StaticPropsValue<T>> & {
  props: T;
} & TPropertyValue<
    StaticPropsValue<T>,
    PropertyType.CUSTOM_AUTH,
    ValidationInputType.ANY,
    R
  >;
