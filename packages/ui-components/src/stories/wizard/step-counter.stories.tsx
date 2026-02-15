import type { Meta, StoryObj } from '@storybook/react';

import { StepCounter } from '../../ui/step-counter';

/**
 * Step counter component for showing progress through multi-step flows.
 * Displays current step and total in "2/5" format.
 */
const meta = {
  title: 'ui/Step Counter',
  component: StepCounter,
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
} satisfies Meta<typeof StepCounter>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default step counter showing "2/5" format
 */
export const Default: Story = {};
