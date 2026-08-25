import { ArrayProperty, Property } from '@openops/blocks-framework';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrayBlockProperty } from '../array-property';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock(
  '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context',
  () => ({
    useDynamicFormValidationContext: () => ({
      formSchemaRef: { current: false },
      removeArrayItemFromSchema: jest.fn(),
      addArrayItemToSchema: jest.fn(),
      initArraySchema: jest.fn(),
    }),
  }),
);

jest.mock('../auto-properties-form', () => ({
  AutoPropertiesFormComponent: () => null,
}));

jest.mock('../text-input-with-mentions', () => ({
  TextInputWithMentions: () => null,
}));

const Harness = ({
  arrayProperty,
  extraActions,
  disabled = false,
}: {
  arrayProperty: ArrayProperty<boolean>;
  extraActions?: React.ReactNode;
  disabled?: boolean;
}) => {
  const form = useForm({ defaultValues: { roles: [] } });
  return (
    <FormProvider {...form}>
      <ArrayBlockProperty
        inputName="roles"
        useMentionTextInput={false}
        disabled={disabled}
        arrayProperty={arrayProperty}
        extraActions={extraActions}
      />
    </FormProvider>
  );
};

const buildArrayProperty = (): ArrayProperty<boolean> =>
  Property.Array({
    displayName: 'Roles',
    required: false,
    properties: {
      name: Property.ShortText({ displayName: 'Name', required: true }),
    },
  });

describe('ArrayBlockProperty footer', () => {
  it('uses "Add Item" as the default add button label', () => {
    render(<Harness arrayProperty={buildArrayProperty()} />);

    const addButton = screen.getByTestId('appendNewArrayItemButton');
    expect(addButton).toHaveTextContent('Add Item');
  });

  it('renders extraActions beside the add button', () => {
    render(
      <Harness
        arrayProperty={buildArrayProperty()}
        extraActions={<button data-testid="extraAction">Extra</button>}
      />,
    );

    const footer = within(screen.getByTestId('arrayPropertyFooter'));
    expect(footer.getByTestId('appendNewArrayItemButton')).toBeInTheDocument();
    expect(footer.getByTestId('extraAction')).toBeInTheDocument();
  });

  it('hides the footer, including extraActions, when disabled', () => {
    render(
      <Harness
        arrayProperty={buildArrayProperty()}
        disabled
        extraActions={<button data-testid="extraAction">Extra</button>}
      />,
    );

    expect(
      screen.queryByTestId('appendNewArrayItemButton'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('extraAction')).not.toBeInTheDocument();
  });
});
