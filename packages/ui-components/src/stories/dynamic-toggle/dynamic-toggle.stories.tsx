import { TooltipProvider } from '@radix-ui/react-tooltip';
import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/testing-library';
import { DynamicToggle } from '../../components/dynamic-toggle/dynamic-toggle';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

const meta: Meta<typeof DynamicToggle> = {
  title: 'Components/DynamicToggle',
  component: DynamicToggle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  argTypes: {
    options: {
      control: {
        type: 'object',
      },
    },
  },
};

type Story = StoryObj<typeof DynamicToggle>;

const options = [
  {
    value: 'Static',
    label: 'Static',
    tooltipText: 'This is a static value',
  },
  {
    value: 'Dynamic',
    label: 'Dynamic',
    tooltipText: 'This is a dynamic value',
  },
];

export const Default: Story = {
  args: {
    options,
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    await userEvent.hover(canvas.getByText('Static'));
    await waitFor(() => {
      expect(canvas.getByRole('tooltip')).toHaveTextContent(
        'This is a static value',
      );
    });
    await userEvent.click(canvas.getByText('Dynamic'));
  },
};

export const WithInitialValue: Story = {
  args: {
    options,
    defaultValue: 'Dynamic',
    onChange: action('onChange'),
  },
};

export const WithCustomClassName: Story = {
  args: {
    options,
    className: 'bg-purple-200',
    onChange: action('onChange'),
  },
};

export const Disabled: Story = {
  args: {
    options,
    disabled: true,
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.getByText('Static')).toBeDisabled();
    expect(canvas.getByText('Dynamic')).toBeDisabled();
  },
};

export default meta;
