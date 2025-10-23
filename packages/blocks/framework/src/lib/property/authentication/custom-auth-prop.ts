import { Type } from '@sinclair/typebox';
import { StaticPropsValue } from '..';
import { ValidationInputType } from '../../validators/types';
import { ArrayProperty } from '../input/array-property';
import { CheckboxProperty } from '../input/checkbox-property';
import { TPropertyValue } from '../input/common';
import { StaticDropdownProperty } from '../input/dropdown/static-dropdown';
import { DynamicProperties } from '../input/dynamic-prop';
import { JsonProperty } from '../input/json-property';
import { MarkDownProperty } from '../input/markdown-property';
import { NumberProperty } from '../input/number-property';
import { PropertyType } from '../input/property-type';
import {
  LongTextProperty,
  SecretTextProperty,
  ShortTextProperty,
} from '../input/text-property';
import { BaseBlockAuthSchema } from './common';

const CustomAuthProps = Type.Record(
  Type.String(),
  Type.Union([
    ShortTextProperty,
    LongTextProperty,
    SecretTextProperty,
    NumberProperty,
    CheckboxProperty,
    StaticDropdownProperty,
    DynamicProperties,
    ArrayProperty,
  ]),
);

export type CustomAuthProps = Record<
  string,
  | ShortTextProperty<boolean>
  | LongTextProperty<boolean>
  | SecretTextProperty<boolean>
  | NumberProperty<boolean>
  | StaticDropdownProperty<unknown, boolean>
  | DynamicProperties<boolean>
  | CheckboxProperty<boolean>
  | ArrayProperty<boolean>
  | MarkDownProperty
  | JsonProperty<boolean>
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
