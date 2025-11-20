import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAssistantName } from '@/app/features/ai/lib/use-assistant-name';
import { useAppStore } from '@/app/store/app-store';
import { cn, NoAiEnabledPopover } from '@openops/components/ui';

type AiConfigurationPromptProps = {
  className?: string;
};

const AiConfigurationPrompt = ({ className }: AiConfigurationPromptProps) => {
  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const assistantName = useAssistantName();

  if (isLoading || hasActiveAiSettings || !isAiChatOpened) return null;

  return (
    <NoAiEnabledPopover
      className={cn('absolute left-4 bottom-[17px] z-50', className)}
      onCloseClick={() => setIsAiChatOpened(false)}
      title={assistantName}
    />
  );
};

AiConfigurationPrompt.displayName = 'AiConfigurationPrompt';
export { AiConfigurationPrompt };
