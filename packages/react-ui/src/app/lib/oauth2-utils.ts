import { nanoid } from 'nanoid';

let currentPopup: Window | null = null;

export const oauth2Utils = {
  openOAuth2Popup,
  openWithLoginUrl,
};

async function openWithLoginUrl(loginUrl: string, redirectUrl: string) {
  currentPopup = openWindow(loginUrl);
  return {
    code: await getCode(redirectUrl, null),
    codeChallenge: undefined,
  };
}

async function openOAuth2Popup(
  params: OAuth2PopupParams,
): Promise<OAuth2PopupResponse> {
  closeOAuth2Popup();
  const pckeChallenge = nanoid();
  const nonce = nanoid();
  const state = `${nonce}_${btoa(window.location.origin)}`;
  const url = constructUrl(params, pckeChallenge, state);
  currentPopup = openWindow(url);
  return {
    code: await getCode(params.redirectUrl, nonce),
    codeChallenge: params.pkce ? pckeChallenge : undefined,
  };
}

function openWindow(url: string): Window | null {
  const winFeatures = [
    'resizable=no',
    'toolbar=no',
    'left=100',
    'top=100',
    'scrollbars=no',
    'menubar=no',
    'status=no',
    'directories=no',
    'location=no',
    'width=600',
    'height=800',
  ].join(', ');
  return window.open(url, '_blank', winFeatures);
}

function closeOAuth2Popup() {
  currentPopup?.close();
}

function constructUrl(
  params: OAuth2PopupParams,
  pckeChallenge: string,
  state: string,
) {
  const queryParams: Record<string, string> = {
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUrl,
    access_type: 'offline',
    state,
    prompt: 'consent',
    scope: params.scope,
    ...(params.extraParams || {}),
  };
  if (params.pkce) {
    queryParams['code_challenge_method'] = 'plain';
    queryParams['code_challenge'] = pckeChallenge;
  }
  const url = new URL(params.authUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}

const OAUTH_CHANNEL_PREFIX = 'oauth2-redirect-';

function getCode(redirectUrl: string, state: string | null): Promise<string> {
  return new Promise<string>((resolve) => {
    let resolved = false;
    let channel: BroadcastChannel | null = null;

    const channelName = state
      ? `${OAUTH_CHANNEL_PREFIX}${state}`
      : OAUTH_CHANNEL_PREFIX;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      currentPopup?.close();
      window.removeEventListener('message', messageHandler);
      channel?.close();
    };

    const handleCode = (code: string) => {
      if (resolved) return;
      cleanup();
      resolve(decodeURIComponent(code));
    };

    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (event.data?.code) {
          handleCode(event.data.code);
        }
      };
    } catch {
      console.warn('BroadcastChannel not supported...');
    }

    function messageHandler(event: MessageEvent) {
      if (
        redirectUrl &&
        redirectUrl.startsWith(event.origin) &&
        event.data?.['code']
      ) {
        handleCode(event.data.code);
      }
    }
    window.addEventListener('message', messageHandler);
  });
}

type OAuth2PopupParams = {
  authUrl: string;
  clientId: string;
  redirectUrl: string;
  scope: string;
  pkce: boolean;
  extraParams?: Record<string, string>;
};

type OAuth2PopupResponse = {
  code: string;
  codeChallenge: string | undefined;
};
