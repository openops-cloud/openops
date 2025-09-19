import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '@openops/components/ui';
import { t } from 'i18next';
import { Copy } from 'lucide-react';
import React from 'react';

type WebhookTestInfoProps = {
  webhookUrl: string;
};

export const CatchWebhookTestInfo: React.FC<WebhookTestInfoProps> = ({
  webhookUrl,
}) => {
  const testUrl = `${webhookUrl}/test`;
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(testUrl);
      toast({ description: t('Copied to clipboard') });
    } catch {
      toast({ title: t('Failed to copy to clipboard') });
    }
  };

  return (
    <div className="w-full rounded-sm border p-2 bg-background">
      <div className="text-sm font-bold mb-2">{t('Test URL')}</div>

      <div className="rounded-xs border bg-background">
        <div className="flex items-center justify-between gap-2 text-sm font-mono">
          <div className="min-w-0 truncate pl-2">
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap"
            >
              {testUrl}
            </a>
          </div>

          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('Copy URL')}
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Copy')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <p className="text-sm mt-2">
        {t('This URL generates sample data and does NOT trigger the flow.')}
      </p>
    </div>
  );
};
