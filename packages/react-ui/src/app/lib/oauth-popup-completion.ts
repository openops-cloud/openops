import { OAUTH_CHANNEL_PREFIX } from './oauth2-utils';

export type WaitForOAuthPopupOptions = {
  isSuccess: (data: Record<string, string>) => boolean;
  getErrorMessage?: (data: Record<string, string>) => string | undefined;
  onSuccess: (params: Record<string, string>) => Promise<void>;
};

export function waitForOAuthPopupCompletion(
  nonce: string,
  popup: Window | null,
  options: WaitForOAuthPopupOptions,
): Promise<void> {
  const {
    isSuccess,
    getErrorMessage = (data) => data.error,
    onSuccess,
  } = options;

  return new Promise<void>((resolve, reject) => {
    const channelName = `${OAUTH_CHANNEL_PREFIX}${nonce}`;
    const channel = new BroadcastChannel(channelName);
    let isCompleted = false;

    const popupCheckInterval = setInterval(() => {
      if (popup?.closed && !isCompleted) {
        isCompleted = true;
        cleanup();
        reject(new Error('cancelled'));
      }
    }, 500);

    const cleanup = () => {
      clearInterval(popupCheckInterval);
      channel.close();
      globalThis.removeEventListener('message', messageHandler);
    };

    const handleSuccess = async (params: Record<string, string>) => {
      isCompleted = true;
      cleanup();
      try {
        await onSuccess(params);
        resolve();
      } catch (err) {
        console.error('OAuth completion failed:', err);
        reject(
          err instanceof Error ? err : new Error('OAuth completion failed'),
        );
      }
    };

    const handleError = (errorMessage: string | undefined) => {
      isCompleted = true;
      cleanup();
      reject(new Error(errorMessage ?? 'OAuth failed'));
    };

    const routeMessage = (data: Record<string, string> | undefined) => {
      if (!data || isCompleted) return;
      const errorMessage = getErrorMessage(data);
      if (errorMessage) {
        handleError(errorMessage);
      } else if (isSuccess(data)) {
        isCompleted = true;
        void handleSuccess(data);
      }
    };

    channel.onmessage = (event: MessageEvent<Record<string, string>>) => {
      routeMessage(event.data);
    };

    function messageHandler(event: MessageEvent) {
      if (event.origin !== globalThis.location.origin) {
        return;
      }
      routeMessage(event.data as Record<string, string> | undefined);
    }
    globalThis.addEventListener('message', messageHandler);
  });
}
