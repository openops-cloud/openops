import type { Meta, StoryObj } from '@storybook/react-vite';
import { addDays } from 'date-fns';
import { action } from 'storybook/actions';

import { Calendar } from '@/ui/calendar';

const date = new Date(2024, 10, 1);
const today = new Date(2024, 10, 27);

/**
 * A date field component that allows users to enter and edit date.
 */
const meta = {
  title: 'ui/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  argTypes: {
    selected: {
      control: { type: 'date' },
      description: 'The selected date',
    },
    today: {
      control: { type: 'date' },
      description: 'The current date',
      table: {
        defaultValue: { summary: 'new Date()' },
      },
    },
  },
  args: {
    mode: 'single',
    selected: date,
    onSelect: action('onDayClick'),
    className: 'rounded-md border w-fit',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the calendar.
 */
export const Default: Story = {
  args: {
    today,
  },
};

/**
 * Use the `multiple` mode to select multiple dates.
 */
export const Multiple: Story = {
  args: {
    ...Default.args,
    min: 1,
    selected: [date, addDays(date, 2), addDays(date, 8)],
    mode: 'multiple',
  },
};

/**
 * Use the `range` mode to select a range of dates.
 */
export const Range: Story = {
  args: {
    ...Default.args,
    selected: {
      from: date,
      to: addDays(date, 7),
    },
    mode: 'range',
  },
};

/**
 * Use the `disabled` prop to disable specific dates.
 */
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: [
      addDays(date, 1),
      addDays(date, 2),
      addDays(date, 3),
      addDays(date, 5),
    ],
  },
};

/**
 * Use the `numberOfMonths` prop to display multiple months.
 */
export const MultipleMonths: Story = {
  args: {
    ...Default.args,
    numberOfMonths: 2,
    showOutsideDays: false,
  },
};
