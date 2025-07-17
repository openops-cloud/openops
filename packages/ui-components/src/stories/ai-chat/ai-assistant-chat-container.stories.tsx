/* eslint-disable react-hooks/rules-of-hooks */

import { action } from '@storybook/addon-actions';
import { useArgs, useCallback, useState } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { useRef } from 'react';
import { ThemeAwareContainer } from '../../../.storybook/decorators';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatContainer,
  AIChatMessages,
  BoxSize,
  MarkdownCodeVariations,
} from '../../components';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleAIChatMessages } from './sample-messages';
import { sampleScopeOptions } from './sample-scope-options';

const useAiChatToggleAndDimensions = () => {
  const [{ aiChatSize, toggleAiChatState }, updateArgs] = useArgs();

  const toggleAiChatStateSize = useCallback(() => {
    const newSizeState =
      aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
        ? AI_CHAT_CONTAINER_SIZES.DOCKED
        : AI_CHAT_CONTAINER_SIZES.EXPANDED;

    const newDimensions = {
      width: newSizeState === AI_CHAT_CONTAINER_SIZES.EXPANDED ? 600 : 400,
      height: newSizeState === AI_CHAT_CONTAINER_SIZES.EXPANDED ? 600 : 400,
    };

    toggleAiChatState(newSizeState);
    updateArgs({
      aiChatSize: newSizeState,
      dimensions: newDimensions,
    });
    setDimensions(newDimensions);
  }, [aiChatSize, toggleAiChatState, updateArgs]);

  const [dimensions, setDimensions] = useState<BoxSize>({
    width: 400,
    height: 400,
  });

  const updateDimensionsState = useCallback(
    (newDimensions: BoxSize) => {
      setDimensions(newDimensions);
      updateArgs({
        dimensions: newDimensions,
      });
    },
    [updateArgs],
  );

  return {
    aiChatSize,
    toggleAiChatStateSize,
    dimensions,
    updateDimensionsState,
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
    dimensions: {
      width: 400,
      height: 400,
    },
    setDimensions: fn(),
    maxSize: {
      width: 600,
      height: 600,
    },
    showAiChat: false,
    onCloseClick: action('onCloseClick'),
    input: '',
    handleInputChange: action('handleInputChange'),
    handleSubmit: action('handleSubmit'),
    aiChatSize: 'docked',
    toggleAiChatState: fn(),
    onCreateNewChatClick: action('onNewChatClick'),
    availableModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-2'],
    selectedModel: 'gpt-4',
    onModelSelected: action('onModelSelected'),
    isModelSelectorLoading: false,
  },

  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[800px] flex items-center">
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </div>
    ),
  ],
  render: (args) => {
    const lastUserMessageRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
    const {
      aiChatSize,
      toggleAiChatStateSize,
      dimensions,
      updateDimensionsState,
    } = useAiChatToggleAndDimensions();

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        dimensions={dimensions}
        setDimensions={updateDimensionsState}
        showAiChat={true}
        className="relative w-full"
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
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
  parameters: {
    chromatic: { delay: 1000 },
  },
  render: (args) => {
    const {
      aiChatSize,
      toggleAiChatStateSize,
      dimensions,
      updateDimensionsState,
    } = useAiChatToggleAndDimensions();
    const lastUserMessageRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        dimensions={dimensions}
        setDimensions={updateDimensionsState}
        showAiChat={true}
        className="relative w-full"
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        messages={sampleAIChatMessages}
      >
        <ThemeAwareContainer
          component={AIChatMessages}
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyMultiline}
          lastUserMessageRef={lastUserMessageRef}
          lastAssistantMessageRef={lastAssistantMessageRef}
        />
      </AiAssistantChatContainer>
    );
  },
};

export const WithMessagesCopyAndInject: Story = {
  args: {
    isEmpty: false,
  },
  parameters: {
    chromatic: { delay: 500 },
  },
  render: (args) => {
    const {
      aiChatSize,
      toggleAiChatStateSize,
      dimensions,
      updateDimensionsState,
    } = useAiChatToggleAndDimensions();

    const lastUserMessageRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageRef = useRef<HTMLDivElement>(null);

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        dimensions={dimensions}
        setDimensions={updateDimensionsState}
        showAiChat={true}
        className="relative w-full"
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        messages={sampleAIChatMessages}
      >
        <ThemeAwareContainer
          component={AIChatMessages}
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyAndInject}
          lastUserMessageRef={lastUserMessageRef}
          lastAssistantMessageRef={lastAssistantMessageRef}
        />
      </AiAssistantChatContainer>
    );
  },
};

/**
 * AiAssistantChatContainer with scope selector functionality.
 * This demonstrates how the component can be used to add context from steps to the AI conversation.
 * Users can add and remove scope items to provide additional context to their queries.
 */
export const WithScopeSelector: Story = {
  args: {
    isEmpty: false,
    scopeOptions: sampleScopeOptions,
    selectedScopeItems: [],
    onScopeSelected: action('Scope selected'),
    onAiScopeItemRemove: action('Scope item removed'),
  },
  parameters: {
    chromatic: { delay: 500 },
  },
  render: (args) => {
    const {
      aiChatSize,
      toggleAiChatStateSize,
      dimensions,
      updateDimensionsState,
    } = useAiChatToggleAndDimensions();

    const lastUserMessageRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageRef = useRef<HTMLDivElement>(null);

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        dimensions={dimensions}
        setDimensions={updateDimensionsState}
        showAiChat={true}
        className="relative w-full"
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        messages={sampleAIChatMessages}
      >
        <ThemeAwareContainer
          component={AIChatMessages}
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyAndInject}
          lastUserMessageRef={lastUserMessageRef}
          lastAssistantMessageRef={lastAssistantMessageRef}
        />
      </AiAssistantChatContainer>
    );
  },
};

/**
 * AiAssistantChatContainer with pre-selected scope items.
 * This demonstrates how the component looks when scope items are already selected.
 */
export const WithPreselectedScopeItems: Story = {
  args: {
    isEmpty: false,
    scopeOptions: sampleScopeOptions,
    selectedScopeItems: [
      sampleScopeOptions[0],
      sampleScopeOptions[2],
      sampleScopeOptions[3],
      sampleScopeOptions[4],
      sampleScopeOptions[5],
      sampleScopeOptions[6],
      sampleScopeOptions[7],
      sampleScopeOptions[8],
      sampleScopeOptions[9],
      sampleScopeOptions[10],
    ],
    onScopeSelected: action('Scope selected'),
    onAiScopeItemRemove: action('Scope item removed'),
  },
  parameters: {
    chromatic: { delay: 500 },
  },
  render: (args) => {
    const {
      aiChatSize,
      toggleAiChatStateSize,
      dimensions,
      updateDimensionsState,
    } = useAiChatToggleAndDimensions();

    const lastUserMessageRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageRef = useRef<HTMLDivElement>(null);

    return (
      <AiAssistantChatContainer
        {...args}
        aiChatSize={aiChatSize}
        toggleAiChatState={toggleAiChatStateSize}
        dimensions={dimensions}
        setDimensions={updateDimensionsState}
        showAiChat={true}
        className="relative w-full"
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        messages={sampleAIChatMessages}
      >
        <ThemeAwareContainer
          component={AIChatMessages}
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
          codeVariation={MarkdownCodeVariations.WithCopyAndInject}
          lastUserMessageRef={lastUserMessageRef}
          lastAssistantMessageRef={lastAssistantMessageRef}
        />
      </AiAssistantChatContainer>
    );
  },
};
