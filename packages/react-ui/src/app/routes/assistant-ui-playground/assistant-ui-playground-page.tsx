import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';
import { noop } from 'lodash-es';
import { useCallback } from 'react';

const AssistantUiPlaygroundPage = () => {
  const handleInject = useCallback((codeContent: string) => {
    // eslint-disable-next-line no-console
    console.log('inject codeContent: ', codeContent);
  }, []);
  return (
    <div className="flex h-screen w-full flex-col">
      <AssistantUiChat onClose={noop} handleInject={handleInject} />
    </div>
  );
};
AssistantUiPlaygroundPage.displayName = 'AssistantUiPlaygroundPage';

export { AssistantUiPlaygroundPage };
