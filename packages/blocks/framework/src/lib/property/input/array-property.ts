import { Type } from '@sinclair/typebox';
import { ValidationInputType } from '../../validators/types';
import { CheckboxProperty } from './checkbox-property';
import { BasePropertySchema, TPropertyValue } from './common';
import { DateTimeProperty } from './date-time-property';
import {
  DropdownProperty,
  MultiSelectDropdownProperty,
} from './dropdown/dropdown-prop';
import {
  StaticDropdownProperty,
  StaticMultiSelectDropdownProperty,
} from './dropdown/static-dropdown';
import { DynamicProperties } from './dynamic-prop';
import { FileProperty } from './file-property';
import { JsonProperty } from './json-property';
import { MarkDownProperty } from './markdown-property';
import { NumberProperty } from './number-property';
import { ObjectProperty } from './object-property';
import { PropertyType } from './property-type';
import { LongTextProperty, ShortTextProperty } from './text-property';

export const ArraySubProps = Type.Record(
  Type.String(),
  Type.Union([
    ShortTextProperty,
    LongTextProperty,
    StaticDropdownProperty,
    MultiSelectDropdownProperty,
    StaticMultiSelectDropdownProperty,
    CheckboxProperty,
    NumberProperty,
    DateTimeProperty,
    FileProperty,
    JsonProperty,
    MarkDownProperty,
    ObjectProperty,
    DropdownProperty,
    DynamicProperties,
  ]),
);

export const ArrayProperty = Type.Composite([
  BasePropertySchema,
  Type.Object({
    properties: ArraySubProps,
  }),
  TPropertyValue(Type.Array(Type.Unknown()), PropertyType.ARRAY),
]);

export type ArraySubProps<R extends boolean> = Record<
  string,
  | ShortTextProperty<R>
  | LongTextProperty<R>
  | StaticDropdownProperty<any, R>
  | MultiSelectDropdownProperty<any, R>
  | StaticMultiSelectDropdownProperty<any, R>
  | CheckboxProperty<R>
  | NumberProperty<R>
  | DateTimeProperty<R>
  | FileProperty<R>
  | JsonProperty<R>
  | MarkDownProperty
  | ObjectProperty<R>
  | DropdownProperty<any, R>
  | DynamicProperties<R>
>;

export type ArrayProperty<R extends boolean> = BasePropertySchema & {
  properties?: ArraySubProps<R>;
} & TPropertyValue<unknown[], PropertyType.ARRAY, ValidationInputType.ARRAY, R>;
