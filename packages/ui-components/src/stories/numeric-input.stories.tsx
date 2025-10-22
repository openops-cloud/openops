import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { ThemeAwareDecorator } from '../../.storybook/decorators';
import { NumericInput } from '../ui/numeric-input';

/**
 * A numeric input field with increment and decrement buttons.
 * Extends the base Input component with controls for selecting next/previous values.
 */
const meta = {
  title: 'ui/NumericInput',
  component: NumericInput,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
      description: 'The current numeric value',
    },
    min: {
      control: 'number',
      description: 'Minimum allowed value',
    },
    max: {
      control: 'number',
      description: 'Maximum allowed value',
    },
    step: {
      control: 'number',
      description: 'The increment/decrement step',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
  args: {
    className: 'w-96',
    placeholder: 'Enter a number',
    disabled: false,
    step: 1,
  },
  decorators: [ThemeAwareDecorator],
  parameters: {
    layout: 'centered',
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<number | undefined>(0);
    return <NumericInput {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof NumericInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the numeric input field with increment/decrement buttons.
 */
export const Default: Story = {};

/**
 * Use the `disabled` prop to make the input non-interactive and appear faded,
 * indicating that input is not currently accepted.
 */
export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Use `min` and `max` props to constrain the input value to a specific range.
 * The buttons will be disabled when reaching the limits.
 */
export const WithMinMax: Story = {
  args: {
    min: 0,
    max: 10,
  },
};

/**
 * Use the `step` prop to control the increment/decrement amount.
 * Useful for values that should change by specific intervals.
 */
export const WithStep: Story = {
  args: {
    step: 5,
    min: 0,
    max: 100,
  },
};

/**
 * Use the `aria-invalid` attribute and `border-destructive` class to show
 * an invalid state with error styling.
 */
export const Invalid: Story = {
  args: {
    min: 0,
    max: 100,
    className: 'w-96 border-destructive focus-visible:ring-destructive',
    'aria-invalid': true,
  },
};
