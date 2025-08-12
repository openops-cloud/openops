import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { fireEvent } from '@storybook/testing-library';
import {
  ThemeAwareContainer,
  ThemeAwareDecorator,
} from '../../../.storybook/decorators';
import { MarkdownCodeVariations } from '../../components';
import { AIChatMessages } from '../../components/ai-chat-messages/ai-chat-messages';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { sampleAIChatMessages } from './sample-messages';

const meta: Meta<typeof AIChatMessages> = {
  title: 'Components/AIChatMessages',
  component: AIChatMessages,
  args: {
    onInject: action('Inject command'),
  },
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
  render: (args) => (
    <ThemeAwareContainer component={AIChatMessages} {...args} />
  ),
};

export default meta;
type Story = StoryObj<typeof AIChatMessages>;

export const CLIExample: Story = {
  args: {
    onInject: fn(),
    messages: sampleAIChatMessages,
    codeVariation: MarkdownCodeVariations.WithCopyAndInject,
  },
  play: async ({ canvasElement, args }) => {
    const firstInjectButton = selectLightOrDarkCanvas(
      canvasElement,
    ).getAllByRole('button', { name: 'Inject command' })[0];

    fireEvent.click(firstInjectButton);

    expect(args.onInject).toHaveBeenCalledWith(
      expect.stringContaining('aws ec2 describe-instances'),
    );

    const secondInjectButton = selectLightOrDarkCanvas(
      canvasElement,
    ).getAllByRole('button', { name: 'Inject command' })[1];

    fireEvent.click(secondInjectButton);

    expect(args.onInject).toHaveBeenCalledWith(
      expect.stringContaining('aws ce get-cost-and-usage'),
    );
  },
};

export const CLIExampleWithoutInject: Story = {
  args: {
    onInject: fn(),
    messages: sampleAIChatMessages,
    codeVariation: MarkdownCodeVariations.WithCopyMultiline,
  },
};

export const SourceCodeExample: Story = {
  args: {
    onInject: fn(),
    codeVariation: MarkdownCodeVariations.WithCopyAndInject,
    messages: sampleAIChatMessages.slice(4),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates SourceCode message functionality with tabbed interface',
      },
    },
  },
};
