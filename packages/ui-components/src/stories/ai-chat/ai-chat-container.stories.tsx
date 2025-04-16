import type { Meta, StoryObj } from '@storybook/react';
import { AiChatContainer } from '../../components';

/**
 * Displays a list of icons with optional tooltips and additional metadata.
 */
const meta = {
  title: 'Components/AiChatContainer',
  component: AiChatContainer,
  tags: ['autodocs'],
} satisfies Meta<typeof AiChatContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default variant of the AiChatContainer component.
 */
export const Default: Story = {
  args: {
    parentHeight: 500,
    parentWidth: 500,
  },
};
