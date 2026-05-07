import type { Meta, StoryObj } from '@storybook/react-vite';

import { X } from 'lucide-react';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

/**
 * Displays rich content in a portal, triggered by a button.
 */
const meta = {
  title: 'ui/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {},

  render: () => (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>Place content for the popover here.</PopoverContent>
    </Popover>
  ),
  parameters: {
    layout: 'centered',
    chromatic: { disable: true }, // TODO: needs actionability test to click the trigger text element and display the dropdown menu content the trigger text element and display the dropdown menu content
  },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the popover.
 */
export const Default: Story = {};

/**
 * A popover that can be closed only by a close button inside. Interactions outside don't affect the popover
 */
export const ManuallyClosable: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col">
          <PopoverClose asChild>
            <X role="button" className="self-end"></X>
          </PopoverClose>
          Content
        </div>
      </PopoverContent>
    </Popover>
  ),
};
