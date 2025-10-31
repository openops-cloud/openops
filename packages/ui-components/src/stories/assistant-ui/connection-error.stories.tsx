import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { ConnectionError } from '../../components/assistant-ui/thread/connection-error';

const meta: Meta<typeof ConnectionError> = {
  title: 'Assistant UI/Thread/ConnectionError',
  component: ConnectionError,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
};

export default meta;
type Story = StoryObj<typeof ConnectionError>;

export const Default: Story = {
  args: {
    error:
      'Connection lost. The server stopped responding. Start a new chat or refresh your browser.',
  },
};
