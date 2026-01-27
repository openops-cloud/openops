import { nanoid } from 'nanoid';

import { OAUTH_CHANNEL_PREFIX } from '@/app/shared/oauth-channel-prefix';

let currentPopup: Window | null = null;
let currentResolve: ((value: string | null) => void) | null = null;

export const oauth2Utils = {
  openOAuth2Popup,
  openWithLoginUrl,
};

async function openWithLoginUrl(loginUrl: string, redirectUrl: string) {
  disposeOAuth2Popup();
  currentPopup = openWindow(loginUrl);
  return {
    code: await getCode(redirectUrl, null),
    codeChallenge: undefined,
  };
}

async function openOAuth2Popup(
  params: OAuth2PopupParams,
): Promise<OAuth2PopupResponse> {
  disposeOAuth2Popup();
  const pkceChallenge = nanoid();
  const nonce = nanoid();
  const state = `${nonce}_${btoa(window.location.origin)}`;
  const url = constructUrl(params, pkceChallenge, state);
  currentPopup = openWindow(url);
  return {
    code: (await getCode(params.redirectUrl, nonce)) ?? '',
    codeChallenge: params.pkce ? pkceChallenge : undefined,
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

function disposeOAuth2Popup() {
  currentPopup = null;
  currentResolve?.(null);
  currentResolve = null;
}

function constructUrl(
  params: OAuth2PopupParams,
  pkceChallenge: string,
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
    queryParams['code_challenge'] = pkceChallenge;
  }
  const url = new URL(params.authUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}

function getCode(
  redirectUrl: string,
  state: string | null,
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;
    currentResolve = resolve;
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
      if (currentResolve === resolve) {
        currentResolve = null;
      }
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
        const eventState = event.data?.['state'];
        if (state && eventState && eventState !== state) {
          return;
        }
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
