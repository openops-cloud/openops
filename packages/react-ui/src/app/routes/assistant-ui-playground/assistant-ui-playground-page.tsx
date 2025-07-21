import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';

const AssistantUiPlaygroundPage = () => (
  <div className="flex h-screen w-full flex-col">
    <AssistantUiChat />
  </div>
);
AssistantUiPlaygroundPage.displayName = 'AssistantUiPlaygroundPage';

export { AssistantUiPlaygroundPage };
