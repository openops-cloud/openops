import type { Meta, StoryObj } from '@storybook/react';
import { BlockIconList } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

/**
 * Displays a list of icons with optional tooltips and additional metadata.
 */
const meta = {
  title: 'Components/BlockIconList',
  component: BlockIconList,
  tags: ['autodocs'],
  args: {
    metadata: [
      {
        displayName: 'Block 1',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 2',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 3',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
    ],
    maxNumberOfIconsToShow: 2,
    size: 'md',
  },
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      options: ['xxl', 'xl', 'lg', 'md', 'sm'],
      control: { type: 'select' },
    },
    maxNumberOfIconsToShow: {
      control: { type: 'number' },
    },
  },
  render: (args) => (
    <TooltipProvider>
      <div className="bg-background p-4">
        <BlockIconList {...args} />
      </div>
    </TooltipProvider>
  ),
} satisfies Meta<typeof BlockIconList>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default variant of the BlockIconList component.
 */
export const Default: Story = {};

/**
 * A list showing all icons without truncation.
 */
export const ShowAllIcons: Story = {
  args: {
    maxNumberOfIconsToShow: 5,
    metadata: [
      {
        displayName: 'Block 1',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 2',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 3',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 4',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
    ],
  },
};

/**
 * A compact list with only one icon visible and a count for the rest.
 */
export const CompactView: Story = {
  args: {
    maxNumberOfIconsToShow: 1,
    metadata: [
      {
        displayName: 'Block 1',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 2',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
      {
        displayName: 'Block 3',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
    ],
  },
};
