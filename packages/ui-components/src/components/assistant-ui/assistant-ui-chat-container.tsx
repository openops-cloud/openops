import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { t } from 'i18next';
import { X as XIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '../../ui/button';
import { TooltipWrapper } from '../tooltip-wrapper';
import { Thread } from './thread';
import { ThreadWelcomeProvider } from './thread-welcome-context';

type AssistantUiChatContainerProps = {
  onCloseClick: () => void;
  runtime: AssistantRuntime;
  children?: ReactNode;
};

const AssistantUiChatContainer = ({
  onCloseClick,
  runtime,
  children,
}: AssistantUiChatContainerProps) => {
  return (
    <div className="h-full flex flex-col bg-background rounded-sm overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 gap-2 text-md dark:text-primary font-bold border-b border-gray-200">
        <div className="flex items-center gap-2">{t('AI Assistant')}</div>
        <div className="flex items-center gap-2">
          {children}
          <TooltipWrapper tooltipText={t('Close')}>
            <Button
              size="icon"
              variant="basic"
              onClick={(e) => {
                e.stopPropagation();
                onCloseClick();
              }}
              className="text-outline"
            >
              <XIcon size={20} />
            </Button>
          </TooltipWrapper>
        </div>
      </div>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
          <Thread />
        </ThreadWelcomeProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
