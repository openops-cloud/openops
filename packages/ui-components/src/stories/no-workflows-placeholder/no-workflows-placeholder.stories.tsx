import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { NoWorkflowsPlaceholder } from '../../components/no-workflows-placeholder/no-workflows-placeholder';

const meta = {
  title: 'Components/NoWorkflowsPlaceholder',
  component: NoWorkflowsPlaceholder,
  tags: ['autodocs'],
  args: {
    onExploreTemplatesClick: action('Explore templates button click'),
    onNewWorkflowClick: action('Explore templates button click'),
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NoWorkflowsPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Big placeholder.
 */
export const Default: Story = {
  render: (args) => (
    <div className="h-[500px]">
      <NoWorkflowsPlaceholder {...args} />
    </div>
  ),
};

/**
 * Medium placeholder.
 */
export const Medium: Story = {
  render: (args) => (
    <div className="h-[360px]">
      <NoWorkflowsPlaceholder {...args} />
    </div>
  ),
};

/**
 * Small placeholder.
 */
export const Small: Story = {
  render: (args) => (
    <div className="h-[170px]">
      <NoWorkflowsPlaceholder {...args} />
    </div>
  ),
};
