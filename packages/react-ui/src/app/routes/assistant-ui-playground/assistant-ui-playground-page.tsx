import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';
import { useCallback } from 'react';

const AssistantUiPlaygroundPage = () => {
  const handleInject = useCallback((codeContent: string) => {
    console.log('inject codeContent: ', codeContent);
  }, []);
  return (
    <div className="flex h-screen w-full flex-col">
      <AssistantUiChat onClose={() => {}} handleInject={handleInject} />
    </div>
  );
};
AssistantUiPlaygroundPage.displayName = 'AssistantUiPlaygroundPage';

export { AssistantUiPlaygroundPage };
