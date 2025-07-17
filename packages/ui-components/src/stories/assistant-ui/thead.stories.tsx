import { ReactNode, createContext } from 'react';
import { Thread } from '../../components/assistant-ui/thread';

// Mock runtime context
const MockRuntimeContext = createContext<any>(null);

// Mock AssistantRuntimeProvider
const MockAssistantRuntimeProvider = ({
  children,
  runtime,
}: {
  children: ReactNode;
  runtime: any;
}) => {
  return (
    <MockRuntimeContext.Provider value={runtime}>
      {children}
    </MockRuntimeContext.Provider>
  );
};

// Mock useChatRuntime hook
const useMockChatRuntime = () => {
  return {
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Hello, how can you help me today?',
      },
      {
        id: '2',
        role: 'assistant',
        content:
          'I can help you with various tasks. What would you like to do?',
      },
    ],
    input: '',
    handleInputChange: () => {},
    handleSubmit: () => {},
    status: 'idle',
    setMessages: () => {},
    stop: () => {},
    isLoading: false,
    error: null,
  };
};

const meta = {
  title: 'Components/AssistantUI/Thread',
  component: Thread,
  tags: ['autodocs'],
  decorators: [
    (Story: any) => {
      const runtime = useMockChatRuntime();
      return (
        <MockAssistantRuntimeProvider runtime={runtime}>
          <div style={{ height: '600px', width: '100%' }}>
            <Story />
          </div>
        </MockAssistantRuntimeProvider>
      );
    },
  ],
};

export default meta;

export const Default = {};
