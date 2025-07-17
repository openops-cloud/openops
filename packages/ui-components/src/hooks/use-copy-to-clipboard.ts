import { t } from 'i18next';
import { useCallback } from 'react';
import { clipboardUtils } from '../lib/clipboard-utils';
import { COPY_PASTE_TOAST_DURATION } from '../lib/constants';
import { useToast } from '../ui/use-toast';

export const useCopyToClipboard = () => {
  const { toast } = useToast();

  const showCopySuccessToast = useCallback(
    () =>
      toast({
        title: t('Copied to clipboard'),
        duration: COPY_PASTE_TOAST_DURATION,
      }),
    [toast],
  );

  const showCopyFailureToast = useCallback(
    () =>
      toast({
        title: t('Failed to copy to clipboard'),
        duration: COPY_PASTE_TOAST_DURATION,
      }),
    [toast],
  );

  const copyToClipboard = useCallback(
    (text: string) => {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(text)
          .then(showCopySuccessToast)
          .catch(showCopyFailureToast);
      } else {
        clipboardUtils.copyInInsecureContext({
          text,
          onSuccess: showCopySuccessToast,
          onError: showCopyFailureToast,
        });
      }
    },
    [showCopySuccessToast, showCopyFailureToast],
  );

  return { copyToClipboard };
};
