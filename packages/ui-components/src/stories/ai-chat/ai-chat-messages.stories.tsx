import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { fireEvent } from '@storybook/testing-library';
import { MarkdownCodeVariations } from '../../components';
import { AIChatMessages } from '../../components/ai-chat-messages/ai-chat-messages';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { Toaster } from '../../ui/toaster';
import { sampleAIChatMessages } from './sample-messages';

const meta: Meta<typeof AIChatMessages> = {
  title: 'Components/AIChatMessages',
  component: AIChatMessages,
  args: {
    onInject: action('Inject command'),
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
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

export const EmptyChat: Story = {
  args: {
    messages: [],
  },
};
