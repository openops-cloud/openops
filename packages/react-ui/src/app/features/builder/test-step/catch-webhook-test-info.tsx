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
  /** Prefix like https://api.example.com/webhooks/{flowId} */
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
      // No-op; optionally show an error toast.
    }
  };

  return (
    <div className="w-full rounded-md border p-3 bg-muted/40">
      <div className="font-medium mb-2">{t('Test URL')}</div>

      {/* Code-block style container, same look-and-feel as Configure markdown */}
      <div className="rounded-md border bg-background overflow-hidden">
        <pre className="m-0 p-2 text-sm overflow-x-auto">
          <a
            href={testUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:no-underline break-all"
          >
            {testUrl}
          </a>
        </pre>
      </div>
      <div className="flex justify-end p-1 border-t">
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

      <p className="text-sm mt-2">
        {t('generates sample data and does NOT trigger the flow.')}
      </p>
    </div>
  );
};
