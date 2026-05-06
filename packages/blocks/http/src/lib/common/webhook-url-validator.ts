import { networkUtls, validateHost } from '@openops/server-shared';

const WEBHOOK_SYNC_PATH_REGEX = /^\/v1\/webhooks\/[0-9A-Za-z]{21}\/sync$/;

function normalizeBasePath(pathname: string): string {
  return pathname.replace(/\/$/, '');
}

function normalizePath(pathname: string): string {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/');
}

function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath || basePath === '/') {
    return pathname;
  }

  if (!pathname.startsWith(basePath)) {
    return pathname;
  }

  return pathname.slice(basePath.length) || '/';
}

function extractWebhookPath(
  pathname: string,
  publicBasePath: string,
  internalBasePath: string,
): string | null {
  const candidates = [
    normalizePath(stripBasePath(pathname, publicBasePath)),
    normalizePath(stripBasePath(pathname, internalBasePath)),
    normalizePath(pathname),
  ];

  return (
    candidates.find((candidate) => WEBHOOK_SYNC_PATH_REGEX.test(candidate)) ??
    null
  );
}

export async function validateAndRewritePublicWebhookUrl(
  userUrl: string,
): Promise<string> {
  if (!userUrl) {
    return userUrl;
  }

  const publicUrl = await networkUtls.getPublicUrl();
  const internalApiUrl = networkUtls.getInternalApiUrl();

  const publicUrlObj = new URL(publicUrl);
  const internalUrlObj = new URL(internalApiUrl);
  const userUrlObj = new URL(userUrl);

  if (userUrlObj.host !== publicUrlObj.host) {
    await validateHost(userUrl);
    return userUrl;
  }

  const publicBasePath = normalizeBasePath(publicUrlObj.pathname);
  const internalBasePath = normalizeBasePath(internalUrlObj.pathname);

  const webhookPath = extractWebhookPath(
    userUrlObj.pathname,
    publicBasePath,
    internalBasePath,
  );

  if (!webhookPath) {
    await validateHost(userUrl);
    return userUrl;
  }

  const rewrittenPath = normalizePath(`${internalBasePath}${webhookPath}`);

  return `${internalUrlObj.origin}${rewrittenPath}${userUrlObj.search}${userUrlObj.hash}`;
}
