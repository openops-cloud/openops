import { t } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const OAUTH_CHANNEL_PREFIX = 'oauth2-redirect-';

function getNonceFromState(state: string | null): string | null {
  if (!state) return null;
  const underscoreIndex = state.indexOf('_');
  if (underscoreIndex > 0) {
    return state.substring(0, underscoreIndex);
  }
  return state;
}

const RedirectPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(error);
      return;
    }

    const callbackData: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'error' && key !== 'state') {
        callbackData[key] = value;
      }
    });

    if (Object.keys(callbackData).length === 0) {
      setStatus('error');
      setErrorMessage(t('Missing required parameters.'));
      return;
    }

    const nonce = getNonceFromState(state);
    const channelName = nonce
      ? `${OAUTH_CHANNEL_PREFIX}${nonce}`
      : OAUTH_CHANNEL_PREFIX;

    // for backwards compatibility with old code that expects a code parameter only
    const payload = state ? { ...callbackData, state } : callbackData;

    try {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage(payload);
      channel.close();

      if (window.opener) {
        window.opener.postMessage(payload, '*');
      }

      setStatus('success');

      setTimeout(() => {
        window.close();
      }, 300);
    } catch {
      setStatus('error');
      setErrorMessage(
        t('Something went wrong. Please close this window and try again.'),
      );
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h1 className="text-lg font-semibold text-foreground">
              {t('Processing...')}
            </h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mb-4 text-4xl text-green-600">✓</div>
            <h1 className="text-lg font-semibold text-foreground">
              {t('Authorization successful!')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('This window will close automatically.')}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mb-4 text-4xl text-red-600">✗</div>
            <h1 className="text-lg font-semibold text-foreground">
              {t('Authorization failed')}
            </h1>
            <p className="text-muted-foreground mt-2">{errorMessage}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              {t('Close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

RedirectPage.displayName = 'RedirectPage';
export { RedirectPage };
