import { Property } from '@openops/blocks-framework';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { AwsBulkRolesPanel, BulkAddResult } from '../aws-bulk-roles-panel';

jest.mock('i18next', () => ({
  t: (key: string, opts?: Record<string, string | number>) =>
    opts ? key.replace(/\{(\w+)\}/g, (_, k) => String(opts[k] ?? '')) : key,
}));

const mockAddArrayItemsToSchema = jest.fn();

jest.mock(
  '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context',
  () => ({
    useDynamicFormValidationContext: () => ({
      addArrayItemsToSchema: mockAddArrayItemsToSchema,
    }),
  }),
);

const ROLES_FIELD_NAME = 'request.value.props.roles';

const rolesProperties = {
  assumeRoleArn: Property.ShortText({
    displayName: 'Assume Role ARN',
    required: true,
  }),
  assumeRoleExternalId: Property.ShortText({
    displayName: 'Assume Role External ID',
    required: false,
  }),
  accountName: Property.ShortText({
    displayName: 'Account Alias',
    required: true,
  }),
};

type Role = {
  assumeRoleArn: string;
  assumeRoleExternalId: string | null;
  accountName: string;
};

type HarnessProps = {
  initialRoles?: Role[];
  initialRoleName?: string;
  initialExternalId?: string;
  onClose: () => void;
  onAccountsAdded?: (result: BulkAddResult) => void;
  onValuesChange: (roles: Role[]) => void;
};

// Mimics ArrayBlockProperty: an independent useFieldArray observer on the same name.
const RolesObserver = () => {
  const { fields } = useFieldArray({ name: ROLES_FIELD_NAME });
  return (
    <ul data-testid="rolesObserver">
      {fields.map((f, i) => (
        <li key={f.id} data-testid={`observedRole${i}`} />
      ))}
    </ul>
  );
};

const Harness = ({
  initialRoles = [],
  initialRoleName = '',
  initialExternalId = '',
  onClose,
  onAccountsAdded = jest.fn(),
  onValuesChange,
}: HarnessProps) => {
  const form = useForm<{
    request: { value: { props: { roles: Role[] } } };
  }>({
    defaultValues: { request: { value: { props: { roles: initialRoles } } } },
  });
  const [roleName, setRoleName] = useState(initialRoleName);
  const [externalId, setExternalId] = useState(initialExternalId);

  return (
    <FormProvider {...form}>
      <AwsBulkRolesPanel
        rolesFieldName={ROLES_FIELD_NAME}
        rolesProperties={rolesProperties}
        roleName={roleName}
        onRoleNameChange={setRoleName}
        externalId={externalId}
        onExternalIdChange={setExternalId}
        onClose={onClose}
        onAccountsAdded={onAccountsAdded}
      />
      <RolesObserver />
      <button
        type="button"
        data-testid="readValues"
        onClick={() => onValuesChange(form.getValues(ROLES_FIELD_NAME))}
      >
        read
      </button>
    </FormProvider>
  );
};

const getTextarea = () =>
  screen.getByTestId('awsBulkAccountIdsInput') as HTMLTextAreaElement;
const getAddButton = () =>
  screen.getByTestId('awsBulkAddAccountsButton') as HTMLButtonElement;
const getRoleNameInput = () =>
  screen.getByTestId('awsBulkRoleNameInput') as HTMLInputElement;
const getExternalIdInput = () =>
  screen.getByTestId('awsBulkExternalIdInput') as HTMLInputElement;

describe('AwsBulkRolesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the valid account count in the add button', () => {
    render(<Harness onClose={jest.fn()} onValuesChange={jest.fn()} />);

    expect(getAddButton()).toHaveTextContent('Add 0 account(s)');

    fireEvent.change(getTextarea(), {
      target: { value: '111122223333\n444455556666\n777788889999\nbad' },
    });

    expect(getAddButton()).toHaveTextContent('Add 3 account(s)');
  });

  it('disables the add button when there are no valid ids', () => {
    render(
      <Harness
        initialRoleName="OpenOpsRole"
        onClose={jest.fn()}
        onValuesChange={jest.fn()}
      />,
    );

    expect(getAddButton()).toBeDisabled();

    fireEvent.change(getTextarea(), { target: { value: 'not-an-id' } });
    expect(getAddButton()).toBeDisabled();

    fireEvent.change(getTextarea(), { target: { value: '111122223333' } });
    expect(getAddButton()).toBeEnabled();
  });

  it('disables the add button when the role name is empty', () => {
    render(<Harness onClose={jest.fn()} onValuesChange={jest.fn()} />);

    fireEvent.change(getTextarea(), { target: { value: '111122223333' } });
    expect(getAddButton()).toBeDisabled();

    fireEvent.change(getRoleNameInput(), { target: { value: '   ' } });
    expect(getAddButton()).toBeDisabled();

    fireEvent.change(getRoleNameInput(), { target: { value: 'OpenOpsRole' } });
    expect(getAddButton()).toBeEnabled();
  });

  it('does not show live invalid/duplicate messages while typing', () => {
    render(
      <Harness
        initialRoles={[
          {
            assumeRoleArn: 'arn:aws:iam::444455556666:role/Existing',
            assumeRoleExternalId: null,
            accountName: 'existing',
          },
        ]}
        onClose={jest.fn()}
        onValuesChange={jest.fn()}
      />,
    );

    fireEvent.change(getTextarea(), {
      target: { value: '111122223333\n98765432109\n444455556666' },
    });

    // No hint text about invalid / duplicate ids while typing; only the count.
    expect(
      screen.queryByText(/12-digit|already|Skipped|invalid/i),
    ).not.toBeInTheDocument();
    expect(getAddButton()).toHaveTextContent('Add 1 account(s)');
  });

  it('appends one role per valid id, clears the textarea and closes', () => {
    const onClose = jest.fn();
    const onAccountsAdded = jest.fn();
    const onValuesChange = jest.fn();
    render(
      <Harness
        initialRoles={[
          {
            assumeRoleArn: 'arn:aws:iam::999999999999:role/Existing',
            assumeRoleExternalId: null,
            accountName: 'existing',
          },
        ]}
        onClose={onClose}
        onAccountsAdded={onAccountsAdded}
        onValuesChange={onValuesChange}
      />,
    );

    fireEvent.change(getRoleNameInput(), { target: { value: 'OpenOpsRole' } });
    fireEvent.change(getExternalIdInput(), {
      target: { value: 'payoneer-openops' },
    });
    fireEvent.change(getTextarea(), {
      target: {
        value:
          '111122223333 prod-eu\n444455556666\n111122223333\n123412341234 existing',
      },
    });

    fireEvent.click(getAddButton());
    fireEvent.click(screen.getByTestId('readValues'));

    expect(onValuesChange).toHaveBeenCalledWith([
      {
        assumeRoleArn: 'arn:aws:iam::999999999999:role/Existing',
        assumeRoleExternalId: null,
        accountName: 'existing',
      },
      {
        assumeRoleArn: 'arn:aws:iam::111122223333:role/OpenOpsRole',
        assumeRoleExternalId: 'payoneer-openops',
        accountName: 'prod-eu',
      },
      {
        assumeRoleArn: 'arn:aws:iam::444455556666:role/OpenOpsRole',
        assumeRoleExternalId: 'payoneer-openops',
        accountName: '444455556666',
      },
    ]);

    // One batched schema update for both new items, starting after the existing role.
    expect(mockAddArrayItemsToSchema).toHaveBeenCalledTimes(1);
    expect(mockAddArrayItemsToSchema).toHaveBeenCalledWith(
      ROLES_FIELD_NAME,
      rolesProperties,
      1,
      2,
    );

    expect(getTextarea().value).toBe('');
    // The alias "existing" is already used by the pre-existing role, so that entry is skipped.
    expect(onAccountsAdded).toHaveBeenCalledWith({
      added: 2,
      invalid: [],
      duplicates: ['111122223333'],
      duplicateAliases: ['existing'],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stores null external id when it is left empty', () => {
    const onValuesChange = jest.fn();
    render(
      <Harness
        initialRoleName="OpenOpsRole"
        onClose={jest.fn()}
        onValuesChange={onValuesChange}
      />,
    );

    fireEvent.change(getTextarea(), { target: { value: '111122223333' } });
    fireEvent.click(getAddButton());
    fireEvent.click(screen.getByTestId('readValues'));

    expect(onValuesChange).toHaveBeenCalledWith([
      {
        assumeRoleArn: 'arn:aws:iam::111122223333:role/OpenOpsRole',
        assumeRoleExternalId: null,
        accountName: '111122223333',
      },
    ]);
  });

  it('keeps role name and external id after adding', () => {
    render(<Harness onClose={jest.fn()} onValuesChange={jest.fn()} />);

    fireEvent.change(getRoleNameInput(), { target: { value: 'OpenOpsRole' } });
    fireEvent.change(getExternalIdInput(), { target: { value: 'ext' } });
    fireEvent.change(getTextarea(), { target: { value: '111122223333' } });
    fireEvent.click(getAddButton());

    expect(getRoleNameInput().value).toBe('OpenOpsRole');
    expect(getExternalIdInput().value).toBe('ext');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} onValuesChange={jest.fn()} />);

    fireEvent.click(screen.getByTestId('awsBulkRolesCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('re-renders sibling useFieldArray observers (ArrayBlockProperty) with the new roles', () => {
    render(
      <Harness
        initialRoles={[
          {
            assumeRoleArn: 'arn:aws:iam::999999999999:role/Existing',
            assumeRoleExternalId: null,
            accountName: 'existing',
          },
        ]}
        initialRoleName="OpenOpsRole"
        onClose={jest.fn()}
        onValuesChange={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId(/^observedRole/)).toHaveLength(1);

    fireEvent.change(getTextarea(), {
      target: { value: '111122223333\n444455556666' },
    });
    fireEvent.click(getAddButton());

    // Regression: useFieldArray().append() from a second instance does not notify
    // other observers in RHF 7.x; setValue() does.
    expect(screen.getAllByTestId(/^observedRole/)).toHaveLength(3);
    expect(screen.getByTestId('observedRole2')).toBeInTheDocument();
  });
});
