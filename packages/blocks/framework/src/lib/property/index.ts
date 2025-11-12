import { Type } from '@sinclair/typebox';
import { BlockAuthProperty } from './authentication';
import { InputProperty } from './input';

// EXPORTED
export { BlockAuth, BlockAuthProperty } from './authentication';
export {
  BasicAuthProperty,
  BasicAuthPropertyValue,
} from './authentication/basic-auth-prop';
export * from './authentication/custom-auth-prop';
export { CustomAuthProperty } from './authentication/custom-auth-prop';
export {
  OAuth2AuthorizationMethod,
  OAuth2Property,
  OAuth2PropertyValue,
  OAuth2Props,
} from './authentication/oauth2-prop';
export { SecretAuthProperty } from './authentication/secret-auth-property';
export { Property } from './input';
export { ArrayProperty, ArraySubProps } from './input/array-property';
export { CheckboxProperty } from './input/checkbox-property';
export { BasePropertySchema } from './input/common';
export { DateTimeProperty } from './input/date-time-property';
export { DropdownOption, DropdownState } from './input/dropdown/common';
export {
  DropdownProperty,
  MultiSelectDropdownProperty,
} from './input/dropdown/dropdown-prop';
export {
  StaticDropdownProperty,
  StaticMultiSelectDropdownProperty,
} from './input/dropdown/static-dropdown';
export {
  DynamicProp,
  DynamicProperties,
  DynamicPropsValue,
} from './input/dynamic-prop';
export { FileProperty, WorkflowFile } from './input/file-property';
export { JsonProperty } from './input/json-property';
export { NumberProperty } from './input/number-property';
export { ObjectProperty } from './input/object-property';
export { PropertyType } from './input/property-type';
export {
  LongTextProperty,
  SecretTextProperty,
  ShortTextProperty,
} from './input/text-property';

export const BlockProperty = Type.Union([InputProperty, BlockAuthProperty]);
export type BlockProperty = InputProperty | BlockAuthProperty;

export const BlockPropertyMap = Type.Record(
  Type.String({
    description: 'Unique property name within the block',
  }),
  BlockProperty,
  {
    description: 'A mapping of property keys to their definitions',
  },
);
export interface BlockPropertyMap {
  [name: string]: BlockProperty;
}

export const InputPropertyMap = Type.Record(Type.String(), InputProperty);
export interface InputPropertyMap {
  [name: string]: InputProperty;
}

export type BlockPropValueSchema<T extends BlockProperty> = T extends undefined
  ? undefined
  : T extends { required: true }
  ? T['valueSchema']
  : T['valueSchema'] | undefined;

export type StaticPropsValue<T extends BlockPropertyMap> = {
  [P in keyof T]: BlockPropValueSchema<T[P]>;
};
