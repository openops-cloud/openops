import { TObject, Type } from '@sinclair/typebox';
import { cloneDeep, get, set } from 'lodash-es';
import {
  createContext,
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { BlockPropertyMap } from '@openops/blocks-framework';

import { formUtils } from '../block-properties/form-utils';

import {
  getArraySchemaNewLength,
  getTransformedKey,
  updateArraySchemaItemsCount,
} from './utils';

export type DynamicFormValidationContextState = {
  formSchema: TObject<any>;
  formSchemaRef: MutableRefObject<boolean>;
  setFormSchema: Dispatch<SetStateAction<TObject<any>>>;
  updateFormSchema: (key: string, newFieldSchema: BlockPropertyMap) => void;
  initArraySchema: (
    arrayKey: string,
    arrayItemDefaultSchema: BlockPropertyMap,
    arrayRequired: boolean,
    currentArrayLength: number,
  ) => void;
  removeArrayItemFromSchema: (
    key: string,
    index: number,
    arrayRequired: boolean,
    currentArrayLength: number,
  ) => void;
  addArrayItemToSchema: (
    arrayKey: string,
    newFieldPropertyMap: BlockPropertyMap,
    currentLastIndex: number,
  ) => void;
  addArrayItemsToSchema: (
    arrayKey: string,
    newFieldPropertyMap: BlockPropertyMap,
    previousArrayLength: number,
    count: number,
  ) => void;
};

const DynamicFormValidationContext = createContext<
  DynamicFormValidationContextState | undefined
>(undefined);

const numberReplacement = 'items.';
const arrayItemsKey = '.items';
const stringReplacement = 'properties.';

export const DynamicFormValidationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [formSchema, setFormSchema] = useState<TObject<any>>(
    Type.Object(Type.Any()),
  );
  const formSchemaRef = useRef<boolean>(false);

  const updateFormSchema = useCallback(
    (key: string, newFieldPropertyMap: BlockPropertyMap) => {
      setFormSchema((prevSchema: any) => {
        if (!prevSchema) return null;

        const newFieldSchema = formUtils.buildSchema(newFieldPropertyMap);
        const currentSchema = cloneDeep(prevSchema);
        const transformedKey = getTransformedKey(
          key,
          numberReplacement,
          stringReplacement,
        );
        set(currentSchema, transformedKey, newFieldSchema);

        return currentSchema;
      });
    },
    [],
  );

  const initArraySchema = useCallback(
    (
      arrayKey: string,
      arrayItemDefaultSchema: BlockPropertyMap,
      arrayRequired: boolean,
      currentArrayLength: number,
    ) => {
      setFormSchema((prevSchema: any) => {
        if (!prevSchema) return null;

        const transformedArrayKey = getTransformedKey(
          arrayKey,
          numberReplacement,
          stringReplacement,
        );
        const schemaWithUpdatedArrayProps = updateArraySchemaItemsCount(
          transformedArrayKey,
          prevSchema,
          getArraySchemaNewLength(currentArrayLength, arrayRequired),
        );

        const arrayItemSchema = formUtils.buildSchema(arrayItemDefaultSchema);
        const arrayItemsSchema = Array.from(
          { length: currentArrayLength },
          () => cloneDeep(arrayItemSchema),
        );

        set(
          schemaWithUpdatedArrayProps,
          `${transformedArrayKey}${arrayItemsKey}`,
          arrayItemsSchema,
        );

        return schemaWithUpdatedArrayProps;
      });
    },
    [],
  );

  const addArrayItemToSchema = useCallback(
    (
      arrayKey: string,
      newFieldPropertyMap: BlockPropertyMap,
      previousArrayLength: number,
    ) => {
      setFormSchema((prevSchema: any) => {
        if (!prevSchema) return null;

        const transformedArrayKey = getTransformedKey(
          arrayKey,
          numberReplacement,
          stringReplacement,
        );
        const schemaWithUpdatedArrayProps = updateArraySchemaItemsCount(
          transformedArrayKey,
          prevSchema,
          previousArrayLength + 1,
        );

        const arrayItemSchema = formUtils.buildSchema(newFieldPropertyMap);
        const transformedArrayItemKey = getTransformedKey(
          `${arrayKey}.${previousArrayLength}`,
          numberReplacement,
          stringReplacement,
        );
        set(
          schemaWithUpdatedArrayProps,
          transformedArrayItemKey,
          arrayItemSchema,
        );

        return schemaWithUpdatedArrayProps;
      });
    },
    [],
  );

  // Batched variant of addArrayItemToSchema: writes `count` item schemas at
  // indices previousArrayLength..previousArrayLength+count-1 in a single
  // functional update. Like N single calls, it never removes existing item
  // schemas; it only grows the tuple's min/max items.
  const addArrayItemsToSchema = useCallback(
    (
      arrayKey: string,
      newFieldPropertyMap: BlockPropertyMap,
      previousArrayLength: number,
      count: number,
    ) => {
      if (count <= 0) {
        return;
      }
      setFormSchema((prevSchema: any) => {
        if (!prevSchema) return null;

        const transformedArrayKey = getTransformedKey(
          arrayKey,
          numberReplacement,
          stringReplacement,
        );
        const schemaWithUpdatedArrayProps = updateArraySchemaItemsCount(
          transformedArrayKey,
          prevSchema,
          previousArrayLength + count,
        );

        const arrayItemSchema = formUtils.buildSchema(newFieldPropertyMap);
        for (let i = 0; i < count; i++) {
          const transformedArrayItemKey = getTransformedKey(
            `${arrayKey}.${previousArrayLength + i}`,
            numberReplacement,
            stringReplacement,
          );
          set(
            schemaWithUpdatedArrayProps,
            transformedArrayItemKey,
            cloneDeep(arrayItemSchema),
          );
        }

        return schemaWithUpdatedArrayProps;
      });
    },
    [],
  );

  const removeArrayItemFromSchema = useCallback(
    (
      arrayKey: string,
      index: number,
      arrayRequired: boolean,
      currentArrayLength: number,
    ) => {
      setFormSchema((prevSchema: any) => {
        if (!prevSchema) return null;

        const transformedArrayKey = getTransformedKey(
          arrayKey,
          numberReplacement,
          stringReplacement,
        );
        const schemaWithUpdatedArrayProps = updateArraySchemaItemsCount(
          transformedArrayKey,
          prevSchema,
          getArraySchemaNewLength(currentArrayLength - 1, arrayRequired),
        );

        const parentArraySchema: any[] = get(
          schemaWithUpdatedArrayProps,
          `${transformedArrayKey}${arrayItemsKey}`,
        );
        parentArraySchema?.splice(index, 1);

        return schemaWithUpdatedArrayProps;
      });
    },
    [],
  );

  return (
    <DynamicFormValidationContext.Provider
      value={{
        formSchema,
        formSchemaRef,
        setFormSchema,
        updateFormSchema,
        initArraySchema,
        addArrayItemToSchema,
        addArrayItemsToSchema,
        removeArrayItemFromSchema,
      }}
    >
      {children}
    </DynamicFormValidationContext.Provider>
  );
};

export const useDynamicFormValidationContext = () => {
  const context = useContext(DynamicFormValidationContext);
  if (context === undefined) {
    throw new Error(
      'useDynamicFormValidationContext must be used within an DynamicFormValidationProvider',
    );
  }
  return context;
};
