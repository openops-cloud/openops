import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { NoAiEnabledPopover } from '../../components';

const meta = {
  title: 'Components/NoAiEnabledPopover',
  component: NoAiEnabledPopover,
  parameters: {
    layout: 'centered',
  },
  args: {
    onCloseClick: action('onCloseClick'),
  },
  tags: ['autodocs'],
  render: () => (
    <BrowserRouter>
      <NoAiEnabledPopover />
    </BrowserRouter>
  ),
} satisfies Meta<typeof NoAiEnabledPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
