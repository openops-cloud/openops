import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router-dom';
import { action } from 'storybook/actions';
import { NoAiEnabledPopover } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

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
  render: (args) => (
    <BrowserRouter>
      <TooltipProvider>
        <NoAiEnabledPopover {...args} />
      </TooltipProvider>
    </BrowserRouter>
  ),
} satisfies Meta<typeof NoAiEnabledPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
