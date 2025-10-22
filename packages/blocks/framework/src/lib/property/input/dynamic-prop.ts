import { Type } from '@sinclair/typebox';
import { PropertyContext } from '../../context';
import { ValidationInputType } from '../../validators/types';
import { BasePropertySchema, TPropertyValue } from './common';
import {
  StaticDropdownProperty,
  StaticMultiSelectDropdownProperty,
} from './dropdown/static-dropdown';
import { PropertyType } from './property-type';
import { ShortTextProperty } from './text-property';

export const DynamicProp = Type.Union([
  ShortTextProperty,
  StaticDropdownProperty,
  StaticMultiSelectDropdownProperty,
]);

export type DynamicProp =
  | ShortTextProperty<boolean>
  | StaticDropdownProperty<any, boolean>
  | StaticMultiSelectDropdownProperty<any, boolean>;

export const DynamicPropsValue = Type.Record(Type.String(), DynamicProp);

export type DynamicPropsValue = Record<string, DynamicProp['valueSchema']>;

export const DynamicProperties = Type.Composite([
  Type.Object({
    refreshers: Type.Array(Type.String()),
  }),
  BasePropertySchema,
  TPropertyValue(Type.Unknown(), PropertyType.DYNAMIC),
]);

export type DynamicProperties<R extends boolean> = BasePropertySchema & {
  props: (
    propsValue: Record<string, DynamicPropsValue>,
    ctx: PropertyContext,
  ) => Promise<Record<string, DynamicProp>>;
  refreshers: string[];
} & TPropertyValue<
    DynamicPropsValue,
    PropertyType.DYNAMIC,
    ValidationInputType.ANY,
    true
  >;
