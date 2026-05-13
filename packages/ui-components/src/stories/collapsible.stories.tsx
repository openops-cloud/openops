import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/ui/collapsible';

/**
 * An interactive component which expands/collapses a panel.
 */
const meta = {
  title: 'ui/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    className: 'w-96',
    disabled: false,
  },
  render: (args) => (
    <Collapsible {...args}>
      <CollapsibleTrigger className="flex gap-2">
        <h3 className="font-semibold">Can I use this in my project?</h3>
        <Info className="size-6" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        Yes. Free to use for personal and commercial projects. No attribution
        required.
      </CollapsibleContent>
    </Collapsible>
  ),
  parameters: {
    layout: 'centered',
    chromatic: { disable: true }, // TODO: needs actionability test to click the trigger text element and display the collapsible content
  },
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the collapsible.
 */
export const Default: Story = {};

/**
 * Use the `disabled` prop to disable the interaction.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
