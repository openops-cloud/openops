import type { Meta, StoryObj } from '@storybook/react';

import { RunWorkflowManuallySuccessToastContent } from '../../components/run-workflow-manually-success-toast/run-workflow-manually-success-toast';

const meta = {
  title: 'components/Flows/RunWorkflowManuallySuccessToastContent',
  component: RunWorkflowManuallySuccessToastContent,
  tags: ['autodocs'],
  argTypes: {
    url: {
      control: 'text',
      description: 'Absolute or relative URL to the Runs page',
    },
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div className="p-6 bg-background rounded-md border w-fit">
      <RunWorkflowManuallySuccessToastContent {...args} />
    </div>
  ),
  args: {
    url: 'https://app.openops.com/runs/123',
  },
} satisfies Meta<typeof RunWorkflowManuallySuccessToastContent>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Renders the content used inside the toast shown after a manual workflow run succeeds.
 */
export const Default: Story = {};
