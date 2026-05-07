import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { DismissiblePanel } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

const meta = {
  title: 'Components/DismissiblePanel',
  component: DismissiblePanel,
  tags: ['autodocs'],
  args: {
    closeTooltip: 'Close tooltip',
    onClose: action('Close button clicked'),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <DismissiblePanel {...args}>
        <div className="w-[500px] h-[500px] p-20 bg-background text-foreground">
          Some content here
        </div>
      </DismissiblePanel>
    </TooltipProvider>
  ),
} satisfies Meta<typeof DismissiblePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default dismissible panel.
 */
export const Default: Story = {};
