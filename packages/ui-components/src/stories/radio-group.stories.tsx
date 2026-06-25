import type { Meta, StoryObj } from '@storybook/react-vite';

import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';

/**
 * A set of checkable buttons—known as radio buttons—where no more than one of
 * the buttons can be checked at a time.
 */
const meta = {
  title: 'ui/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    defaultValue: 'comfortable',
    className:
      'grid gap-2 grid-cols-[1rem_1fr] items-center bg-background p-10',
  },
  render: (args) => (
    <RadioGroup {...args}>
      <RadioGroupItem value="default" id="r1" />
      <label htmlFor="r1" className="text-primary">
        Default
      </label>
      <RadioGroupItem value="comfortable" id="r2" />
      <label htmlFor="r2" className="text-primary">
        Comfortable
      </label>
      <RadioGroupItem value="compact" id="r3" />
      <label htmlFor="r3" className="text-primary">
        Compact
      </label>
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the radio group.
 */
export const Default: Story = {};
