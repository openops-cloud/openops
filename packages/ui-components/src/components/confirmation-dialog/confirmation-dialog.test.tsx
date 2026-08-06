import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ConfirmationDialog } from './confirmation-dialog';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

describe('ConfirmationDialog', () => {
  it('renders headerLeading beside the title and description', () => {
    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Launch Campaign?"
        description="Please verify settings."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        headerLeading={<span data-testid="leading-icon">!</span>}
      />,
    );

    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Launch Campaign?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Please verify settings.')).toBeInTheDocument();
  });

  it('invokes onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Title"
        description="Description"
        confirmButtonText="Go"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders a rich-text description node', () => {
    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Delete campaign?"
        description={
          <>
            You will lose <strong data-testid="highlight">$8,200</strong> in
            savings.
          </>
        }
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByTestId('highlight')).toHaveTextContent('$8,200');
  });

  it('renders the confirm button with the destructive variant when requested', () => {
    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Delete campaign?"
        description="Description"
        confirmButtonText="Delete"
        confirmButtonVariant="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      'bg-destructive',
    );
  });

  it('renders the confirm button with the default variant when no variant is given', () => {
    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Title"
        description="Description"
        confirmButtonText="Go"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveClass(
      'bg-destructive',
    );
  });

  it('invokes onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmationDialog
        isOpen
        onOpenChange={jest.fn()}
        title="Title"
        description="Description"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
