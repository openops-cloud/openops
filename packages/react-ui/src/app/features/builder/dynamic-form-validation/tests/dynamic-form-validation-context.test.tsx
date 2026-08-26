import { Property } from '@openops/blocks-framework';
import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { formUtils } from '../../block-properties/form-utils';
import {
  DynamicFormValidationProvider,
  useDynamicFormValidationContext,
} from '../dynamic-form-validation-context';

const itemProperties = {
  assumeRoleArn: Property.ShortText({
    displayName: 'Assume Role ARN',
    required: true,
  }),
  accountName: Property.ShortText({
    displayName: 'Account Alias',
    required: true,
  }),
};

const rootProperties = {
  roles: Property.Array({
    displayName: 'Roles',
    required: false,
    properties: itemProperties,
  }),
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <DynamicFormValidationProvider>{children}</DynamicFormValidationProvider>
);

const getRolesSchema = (schema: any) => schema.properties.roles;

describe('addArrayItemsToSchema', () => {
  const setup = (initialLength: number) => {
    const view = renderHook(() => useDynamicFormValidationContext(), {
      wrapper,
    });
    act(() => {
      view.result.current.setFormSchema(formUtils.buildSchema(rootProperties));
      view.result.current.initArraySchema(
        'roles',
        itemProperties,
        false,
        initialLength,
      );
    });
    return view;
  };

  it('appends N item schemas and grows min/max items in one update', () => {
    const view = setup(1);

    act(() => {
      view.result.current.addArrayItemsToSchema('roles', itemProperties, 1, 3);
    });

    const roles = getRolesSchema(view.result.current.formSchema);
    expect(roles.items).toHaveLength(4);
    expect(roles.minItems).toBe(4);
    expect(roles.maxItems).toBe(4);
    expect(roles.items[3].properties.assumeRoleArn).toBeDefined();
  });

  it('matches N successive addArrayItemToSchema calls', () => {
    const batched = setup(0);
    const single = setup(0);

    act(() => {
      batched.result.current.addArrayItemsToSchema(
        'roles',
        itemProperties,
        0,
        2,
      );
      single.result.current.addArrayItemToSchema('roles', itemProperties, 0);
      single.result.current.addArrayItemToSchema('roles', itemProperties, 1);
    });

    expect(getRolesSchema(batched.result.current.formSchema)).toEqual(
      getRolesSchema(single.result.current.formSchema),
    );
  });

  it('never removes existing item schemas, even stale ones beyond the value count', () => {
    // Schema initialised for 5 items while the form only holds 1 (simulated drift).
    const batched = setup(5);
    const single = setup(5);

    act(() => {
      batched.result.current.addArrayItemsToSchema(
        'roles',
        itemProperties,
        1,
        2,
      );
      single.result.current.addArrayItemToSchema('roles', itemProperties, 1);
      single.result.current.addArrayItemToSchema('roles', itemProperties, 2);
    });

    const roles = getRolesSchema(batched.result.current.formSchema);
    // Indices 1 and 2 are written in place; the stale 4th/5th schemas are not truncated.
    // (A replace-from-index implementation would leave only 3 items here.)
    expect(roles.items).toHaveLength(5);
    expect(roles.minItems).toBe(3);
    expect(roles.maxItems).toBe(3);
    expect(roles).toEqual(getRolesSchema(single.result.current.formSchema));
  });

  it('is a no-op for a non-positive count', () => {
    const view = setup(2);
    const before = view.result.current.formSchema;

    act(() => {
      view.result.current.addArrayItemsToSchema('roles', itemProperties, 2, 0);
    });

    expect(view.result.current.formSchema).toBe(before);
  });
});
