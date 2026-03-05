import { PermissionMessageContext } from '@openops/components/ui';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { PermissionMessageProvider } from '../permission-message-provider';

jest.mock('i18next', () => ({
  t: (key: string, opts?: Record<string, string>) => {
    if (opts) {
      return key.replace(/\{(\w+)\}/g, (_, k) => opts[k] ?? '');
    }
    return key;
  },
}));

const mockUseCurrentProject = jest.fn();

jest.mock('@/app/common/hooks/project-hooks', () => ({
  projectHooks: {
    useCurrentProject: () => mockUseCurrentProject(),
  },
}));

const ContextConsumer = () => {
  const message = useContext(PermissionMessageContext);
  return <span data-testid="message">{message ?? 'no-message'}</span>;
};

describe('PermissionMessageProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides message with owner email when ownerEmail is present', () => {
    mockUseCurrentProject.mockReturnValue({
      project: { ownerEmail: 'admin@example.com' },
    });

    render(
      <PermissionMessageProvider>
        <ContextConsumer />
      </PermissionMessageProvider>,
    );

    const text = screen.getByTestId('message').textContent;
    expect(text).toContain('admin@example.com');
    expect(text).toContain('Please contact a Workspace owner');
  });

  it.each([
    ['ownerEmail is not present', { ownerEmail: undefined }],
    ['ownerEmail is null', { ownerEmail: null }],
    ['project is null', null],
  ])(
    'falls back to undefined when %s',
    (_description, project: Record<string, unknown> | null) => {
      mockUseCurrentProject.mockReturnValue({ project });

      render(
        <PermissionMessageProvider>
          <ContextConsumer />
        </PermissionMessageProvider>,
      );

      expect(screen.getByTestId('message')).toHaveTextContent('no-message');
    },
  );
});
