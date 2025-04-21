/* eslint-disable react-hooks/rules-of-hooks */
import { useArgs } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AiChatContainer } from '../../components';
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
        options: ['collapsed', 'docked'],
      },
    },
  },
  tags: ['autodocs'],
  render: (args) => {
    const [
      { containerSize, showAiChat, setContainerSizeState, setShowAiChat },
      updateArgs,
    ] = useArgs();

    const onToggleContainerSizeState = () => {
      const newContainerSizeState =
        containerSize === 'docked' ? 'collapsed' : 'docked';
      setContainerSizeState(newContainerSizeState);
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
          setShowAiChat={onSetShowAiChat}
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
    parentWidth: 500,
    containerSize: 'docked',
    showAiChat: true,
    setContainerSizeState: fn(),
    setShowAiChat: fn(),
    onSubmitChat: fn(),
  },
};

export const Collapsed: Story = {
  args: {
    ...Docked.args,
    containerSize: 'collapsed',
  },
};
