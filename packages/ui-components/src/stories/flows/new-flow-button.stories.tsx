import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

import { NewFlowButton } from '../..//components';

const meta = {
  title: 'components/Flows/NewFlowButton',
  component: NewFlowButton,
  tags: ['autodocs'],
  argTypes: {
    onClick: {
      description: 'onClick handler',
      type: 'function',
    },
    loading: {
      type: 'boolean',
      description: 'Shows a loading spinner and disabled the button',
    },
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div className="p-[100px] bg-background flex items-center justify-center">
      <NewFlowButton {...args} />
    </div>
  ),
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof NewFlowButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Displays a new workflow button
 */
export const Enabled: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const button = await canvas.findByRole('button');
    await userEvent.click(button);
    expect(args.onClick).toHaveBeenCalled();
  },
};

/**
 * Displays a new workflow button in a loading state
 */
export const Loading: Story = {
  args: {
    loading: true,
  },
  parameters: {
    chromatic: { disable: true },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const button = await canvas.findByRole('button');
    await userEvent.click(button);
    expect(args.onClick).not.toHaveBeenCalled();
  },
};
