import type { Meta, StoryObj } from '@storybook/react';

import { StepCounter, StepNavigator } from '../../ui/step-navigator';

/**
 * Step navigation components for showing progress through multi-step flows.
 * Includes both text-based and numeric counter formats.
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
  },
  args: {
    current: 2,
    total: 5,
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
  render: (args: { current: number; total: number }) => (
    <StepCounter current={args.current} total={args.total} />
  ),
};

/**
 * Step navigator with labels enabled
 */
export const WithLabels: Story = {
  args: {
    showStepLabels: true,
  },
};
