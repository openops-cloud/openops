import { t } from 'i18next';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';

type GenerateWithAIButtonProps = {
  hasActiveAiSettings: boolean;
  isLoading: boolean;
  isAiChatVisible: boolean;
  settingsPath: string;
  onGenerateWithAIClick: () => void;
  className?: string;
  iconSize?: number;
};

const GenerateWithAIButton = ({
  hasActiveAiSettings,
  isLoading,
  isAiChatVisible,
  settingsPath,
  onGenerateWithAIClick,
  className,
  iconSize = 20,
}: GenerateWithAIButtonProps) =>
  hasActiveAiSettings ? (
    <Button
      variant="link"
      className={cn(
        'h-5 pr-0 py-0 gap-[5px]',
        {
          'text-blueAccent-300': isAiChatVisible,
        },
        className,
      )}
      onClick={onGenerateWithAIClick}
      loading={isLoading}
    >
      <Sparkles size={iconSize} />
      {t('Generate with AI')}
    </Button>
  ) : (
    <Link
      to={settingsPath}
      className={cn(
        'flex items-center h-5 pr-0 py-0 text-blueAccent-300 gap-[5px] hover:underline',
        className,
      )}
    >
      <Sparkles size={iconSize} />
      {t('Configure AI')}
    </Link>
  );

GenerateWithAIButton.displayName = 'GenerateWithAIButton';

export { GenerateWithAIButton };
