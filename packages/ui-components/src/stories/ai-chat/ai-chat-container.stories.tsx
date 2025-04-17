/* eslint-disable react-hooks/rules-of-hooks */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useEffect, useState } from 'react';
import { AiChatContainer, AiChatContainerSizeState } from '../../components';

const meta = {
  title: 'Components/AiChatContainer',
  component: AiChatContainer,
  parameters: {
    layout: 'fullscreen',
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
    const [containerSizeState, setContainerSizeState] =
      useState<AiChatContainerSizeState>(args.containerSize);

    useEffect(() => {
      setContainerSizeState(args.containerSize);
    }, [args.containerSize]);

    const [showAiChat, setShowAiChat] = useState<boolean>(args.showAiChat);
    useEffect(() => {
      setShowAiChat(args.showAiChat);
    }, [args.showAiChat]);

    const onSetContainerSizeState = (state: AiChatContainerSizeState) => {
      setContainerSizeState(state);
      args.setContainerSizeState(state);
    };

    const onSetShowAiChat = (showAiChat: boolean) => {
      setShowAiChat(showAiChat);
      args.setShowAiChat(showAiChat);
    };

    return (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <AiChatContainer
          {...args}
          containerSize={containerSizeState}
          setContainerSizeState={onSetContainerSizeState}
          showAiChat={showAiChat}
          setShowAiChat={onSetShowAiChat}
        />
      </div>
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
