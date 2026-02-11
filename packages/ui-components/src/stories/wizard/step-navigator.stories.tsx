import type { Meta, StoryObj } from '@storybook/react';

import { StepCounter, StepNavigator } from '@/ui/step-navigator';

/**
 * Step navigation components for showing progress through multi-step flows.
 * Includes both numeric counters and dot indicators.
 */
const meta = {
  title: 'ui/Step Navigator',
  component: StepNavigator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    current: {
      control: { type: 'number', min: 1, max: 10 },
    },
    total: {
      control: { type: 'number', min: 1, max: 10 },
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'dots'],
    },
  },
  args: {
    current: 2,
    total: 5,
    variant: 'default',
  },
} satisfies Meta<typeof StepNavigator>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default step navigator showing "Step 2 of 5" format
 */
export const Default: Story = {};

/**
 * Compact counter format matching the Figma design "2/5"
 */
export const Counter: Story = {
  render: (args) => <StepCounter current={args.current} total={args.total} />,
};

/**
 * Dot indicator variant for visual progress
 */
export const Dots: Story = {
  args: {
    variant: 'dots',
  },
};

/**
 * Step navigator with labels enabled
 */
export const WithLabels: Story = {
  args: {
    showStepLabels: true,
  },
};

/**
 * Different step positions
 */
export const FirstStep: Story = {
  args: {
    current: 1,
    total: 5,
  },
};

export const LastStep: Story = {
  args: {
    current: 5,
    total: 5,
  },
};

export const MiddleStep: Story = {
  args: {
    current: 3,
    total: 7,
  },
};

/**
 * Many steps with dots
 */
export const ManyStepsDots: Story = {
  args: {
    current: 4,
    total: 10,
    variant: 'dots',
  },
};

/**
 * Few steps comparison
 */
export const TwoSteps: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-2">Default format</h4>
        <StepNavigator current={1} total={2} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Counter format</h4>
        <StepCounter current={1} total={2} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Dots format</h4>
        <StepNavigator current={1} total={2} variant="dots" />
      </div>
    </div>
  ),
};
