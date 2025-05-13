import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { AiAssistantChatContainer, AIChatMessages } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleAIChatMessages } from './sample-messages';

const meta = {
  title: 'Components/AiAssistantChatContainer',
  component: AiAssistantChatContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {},
  args: {
    isEmpty: true,
    height: 460,
    width: 370,
    showAiChat: false,
    onCloseClick: action('onCloseClick'),
    input: '',
    handleInputChange: action('handleInputChange'),
    handleSubmit: action('handleSubmit'),
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  render: (args) => {
    return (
      <AiAssistantChatContainer
        {...args}
        showAiChat={true}
        className="static"
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
    return (
      <AiAssistantChatContainer {...args} showAiChat={true} className="static">
        <AIChatMessages
          messages={sampleAIChatMessages}
          onInject={action('Inject command')}
        />
      </AiAssistantChatContainer>
    );
  },
};
