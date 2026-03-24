import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarIcon } from 'lucide-react';
import { OverviewCard } from '../../components';

/**
 * Displays an Overview card.
 */
const meta = {
  title: 'Components/OverviewCard',
  component: OverviewCard,
  tags: ['autodocs'],
  args: {
    title: 'Activated workflows',
    icon: <CalendarIcon />,
    value: 10,
    bottomLineText: 'Last week',
    onClick: action('OverviewCard clicked'),
  },
  render: (args) => <OverviewCard {...args} />,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof OverviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default card displaying one item.
 */
export const Default: Story = {};

/**
 * Card without a bottom line text.
 */
export const WithoutBottomLineText: Story = {
  args: {
    bottomLineText: undefined,
  },
};

/**
 * Card without an onClick handler — no pointer cursor is shown.
 */
export const NonClickable: Story = {
  args: {
    onClick: undefined,
  },
};

/**
 * Card with a custom title class name.
 */
export const CustomTitleClassName: Story = {
  args: {
    titleClassName: 'text-blue-400',
  },
};

/**
 * Card with a custom icon wrapper class name.
 */
export const CustomIconWrapperClassName: Story = {
  args: {
    iconWrapperClassName: 'bg-green-400',
  },
};
