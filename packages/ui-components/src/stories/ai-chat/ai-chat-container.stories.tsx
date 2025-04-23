/* eslint-disable react-hooks/rules-of-hooks */
import { useArgs } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AI_CHAT_CONTAINER_SIZES, AiChatContainer } from '../../components';
import { Button } from '../../ui/button';

const meta = {
  title: 'Components/AiChatContainer',
  component: AiChatContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    containerSize: {
      control: {
        type: 'select',
        options: [
          AI_CHAT_CONTAINER_SIZES.COLLAPSED,
          AI_CHAT_CONTAINER_SIZES.DOCKED,
        ],
      },
    },
  },
  tags: ['autodocs'],
  render: (args) => {
    const [
      { containerSize, showAiChat, setShowAiChat, toggleContainerSizeState },
      updateArgs,
    ] = useArgs();

    const onToggleContainerSizeState = () => {
      const newContainerSizeState =
        containerSize === AI_CHAT_CONTAINER_SIZES.DOCKED
          ? AI_CHAT_CONTAINER_SIZES.COLLAPSED
          : AI_CHAT_CONTAINER_SIZES.DOCKED;
      toggleContainerSizeState();
      updateArgs({ containerSize: newContainerSizeState });
    };

    const onSetShowAiChat = (showAiChat: boolean) => {
      setShowAiChat(showAiChat);
      updateArgs({ showAiChat: showAiChat });
    };

    return (
      <>
        {!showAiChat && (
          <Button onClick={() => onSetShowAiChat(true)}>Show AI Chat</Button>
        )}
        <AiChatContainer
          {...args}
          containerSize={containerSize}
          toggleContainerSizeState={onToggleContainerSizeState}
          showAiChat={showAiChat}
          className="static"
        />
      </>
    );
  },
} satisfies Meta<typeof AiChatContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docked: Story = {
  args: {
    parentHeight: 500,
    containerSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
    showAiChat: true,
    toggleContainerSizeState: fn(),
    onSubmitChat: fn(),
  },
};

export const Collapsed: Story = {
  args: {
    ...Docked.args,
    containerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
  },
};
