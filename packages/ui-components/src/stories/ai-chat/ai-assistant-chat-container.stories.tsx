/* eslint-disable react-hooks/rules-of-hooks */

import { action } from '@storybook/addon-actions';
import { useArgs, useCallback } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatContainer,
  AIChatMessages,
  MarkdownCodeVariations,
} from '../../components';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleAIChatMessages } from './sample-messages';

const useAiChatToggle = () => {
  const [{ aiChatSize, toggleAiChatState }, updateArgs] = useArgs();

  const toggleAiChatStateSize = useCallback(() => {
    const newSizeState =
      aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
        ? AI_CHAT_CONTAINER_SIZES.DOCKED
        : AI_CHAT_CONTAINER_SIZES.EXPANDED;

    const newHeight =
      newSizeState === AI_CHAT_CONTAINER_SIZES.EXPANDED ? 600 : 400;
    const newWidth =
      newSizeState === AI_CHAT_CONTAINER_SIZES.EXPANDED ? 600 : 400;

    toggleAiChatState(newSizeState);
    updateArgs({
      aiChatSize: newSizeState,
      height: newHeight,
      width: newWidth,
    });
  }, [aiChatSize, toggleAiChatState, updateArgs]);

  return {
    aiChatSize,
    toggleAiChatStateSize,
  };
};

const meta = {
  title: 'Components/AiAssistantChatContainer',
  component: AiAssistantChatContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    aiChatSize: {
      control: {
        type: 'select',
        options: [
          AI_CHAT_CONTAINER_SIZES.DOCKED,
          AI_CHAT_CONTAINER_SIZES.EXPANDED,
        ],
      },
    },
  },
  args: {
    isEmpty: true,
    height: 400,
    width: 400,
    showAiChat: false,
    onCloseClick: action('onCloseClick'),
    input: '',
    handleInputChange: action('handleInputChange'),
    handleSubmit: action('handleSubmit'),
    aiChatSize: 'docked',
    toggleAiChatState: fn(),
    onCreateNewChatClick: action('onNewChatClick'),
  },

  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[800px]">
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </div>
    ),
  ],
  render: (args) => {
    const { aiChatSize, toggleAiChatStateSize } = useAiChatToggle();

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        width={args.width}
        height={args.height}
        toggleAiChatState={toggleAiChatStateSize}
        showAiChat={true}
        className="static w-full"
      ></AiAssistantChatContainer>
    );
  },
} satisfies Meta<typeof AiAssistantChatContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithMessages: Story = {
  args: {
    isEmpty: false,
  },
  render: (args) => {
    const { aiChatSize, toggleAiChatStateSize } = useAiChatToggle();
    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        showAiChat={true}
        className="static"
      >
        <AIChatMessages
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyMultiline}
        />
      </AiAssistantChatContainer>
    );
  },
};

export const WithMessagesCopyAndInject: Story = {
  args: {
    isEmpty: false,
  },
  render: (args) => {
    const { aiChatSize, toggleAiChatStateSize } = useAiChatToggle();

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        showAiChat={true}
        className="static"
      >
        <AIChatMessages
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyAndInject}
        />
      </AiAssistantChatContainer>
    );
  },
};
