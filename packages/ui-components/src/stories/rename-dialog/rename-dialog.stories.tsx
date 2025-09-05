import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { RenameDialog } from '../../components/rename-dialog/rename-dialog';
import { Button } from '../../ui/button';

/**
 * Dialog to rename an entity. Accepts a trigger as children and manages its own open state.
 */
const meta = {
  title: 'Components/RenameDialog',
  component: RenameDialog,
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onSubmit: { control: false },
    onError: { control: false },
    children: { control: false },
  },
  args: {
    currentName: 'Current name',
  },
} satisfies Meta<typeof RenameDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default usage with a mock async submit and a button trigger.
 */
export const Default: Story = {
  render: (args) => (
    <RenameDialog
      {...args}
      onSubmit={async (newName: string) => {
        await new Promise((r) => setTimeout(r, 600));
        // eslint-disable-next-line no-console
        console.log('Renamed to:', newName);
      }}
    >
      <Button size="sm">Open rename dialog</Button>
    </RenameDialog>
  ),
};
