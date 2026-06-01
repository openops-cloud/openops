import type { Meta, StoryObj } from '@storybook/react-vite';
import { WarningWithIcon } from '../ui/warning-with-icon';

/**
 * Displays warning.
 */
const meta = {
  title: 'ui/WarningWithIcon',
  component: WarningWithIcon,
  tags: ['autodocs'],
  argTypes: {
    Icon: { control: false },
  },
  args: {
    message: 'Warning',
  },
  render: (args) => <WarningWithIcon {...args}></WarningWithIcon>,
} satisfies Meta<typeof WarningWithIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
