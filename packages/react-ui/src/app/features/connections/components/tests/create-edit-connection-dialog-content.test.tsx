import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { BlockAuth, Property } from '@openops/blocks-framework';
import { Dialog } from '@openops/components/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateEditConnectionDialogContent } from '../create-edit-connection-dialog-content';

jest.mock('i18next', () => ({
  t: (key: string, opts?: Record<string, string | number>) =>
    opts ? key.replace(/\{(\w+)\}/g, (_, k) => String(opts[k] ?? '')) : key,
}));

jest.mock('@/app/common/providers/theme-provider', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const mockUseConnectionsMetadata = jest.fn();

jest.mock('../../lib/app-connections-hooks', () => ({
  appConnectionsHooks: {
    useConnectionsMetadata: () => mockUseConnectionsMetadata(),
  },
}));

const rolesProperty = Property.Array({
  displayName: 'Roles',
  required: false,
  properties: {
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
  },
});

const awsAuth = BlockAuth.CustomAuth({
  authProviderKey: 'AWS',
  authProviderDisplayName: 'AWS',
  authProviderLogoUrl: '/blocks/aws.png',
  required: true,
  props: {
    defaultRegion: Property.ShortText({
      displayName: 'Default Region',
      required: true,
    }),
    roles: rolesProperty,
  },
});

const otherAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Other',
  authProviderDisplayName: 'Other',
  authProviderLogoUrl: '/blocks/other.png',
  required: true,
  props: {
    region: Property.ShortText({ displayName: 'Region', required: true }),
    roles: rolesProperty,
  },
});

const renderDialog = (authProviderKey: string) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DynamicFormValidationProvider>
        <Dialog open>
          <CreateEditConnectionDialogContent
            authProviderKey={authProviderKey}
            connectionToEdit={null}
            onConnectionSaved={jest.fn()}
            setOpen={jest.fn()}
          />
        </Dialog>
      </DynamicFormValidationProvider>
    </QueryClientProvider>,
  );
};

describe('CreateEditConnectionDialogContent bulk AWS accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectionsMetadata.mockReturnValue({
      data: { AWS: awsAuth, Other: otherAuth },
    });
  });

  it('shows the bulk accounts trigger for AWS connections', () => {
    renderDialog('AWS');

    expect(screen.getByTestId('awsBulkRolesTrigger')).toBeInTheDocument();
    expect(screen.getByTestId('appendNewArrayItemButton')).toHaveTextContent(
      'Add Item',
    );
    expect(screen.queryByTestId('awsBulkRolesPanel')).not.toBeInTheDocument();
  });

  it('does not show the bulk accounts trigger for other providers', () => {
    renderDialog('Other');

    expect(screen.getByTestId('appendNewArrayItemButton')).toBeInTheDocument();
    expect(screen.queryByTestId('awsBulkRolesTrigger')).not.toBeInTheDocument();
  });

  it('opens the bulk panel from the trigger and closes it again', () => {
    renderDialog('AWS');

    fireEvent.click(screen.getByTestId('awsBulkRolesTrigger'));
    expect(screen.getByTestId('awsBulkRolesPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('awsBulkRolesCloseButton'));
    expect(screen.queryByTestId('awsBulkRolesPanel')).not.toBeInTheDocument();
  });

  it('shows a summary of added and skipped accounts after a bulk add', () => {
    renderDialog('AWS');

    fireEvent.click(screen.getByTestId('awsBulkRolesTrigger'));
    fireEvent.change(screen.getByTestId('awsBulkRoleNameInput'), {
      target: { value: 'OpenOpsRole' },
    });
    fireEvent.change(screen.getByTestId('awsBulkAccountIdsInput'), {
      target: {
        value: '111122223333\n444455556666\n111122223333\n98765432109',
      },
    });
    fireEvent.click(screen.getByTestId('awsBulkAddAccountsButton'));

    expect(screen.queryByTestId('awsBulkRolesPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('awsBulkRolesSummary')).toHaveTextContent(
      'Added 2 account(s). Skipped 1 invalid account ID(s): 98765432109. Skipped 1 already-listed account(s): 111122223333.',
    );

    // Reopening the panel clears the previous summary.
    fireEvent.click(screen.getByTestId('awsBulkRolesTrigger'));
    expect(screen.queryByTestId('awsBulkRolesSummary')).not.toBeInTheDocument();
  });
});
