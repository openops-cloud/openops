import { networkUtls, validateHost } from '@openops/server-shared';

export async function validateAndRewritePublicWebhookUrl(
  userUrl: string,
): Promise<string> {
  if (!userUrl) {
    return userUrl;
  }

  try {
    await validateHost(userUrl);
    return userUrl;
  } catch (error) {
    const publicUrl = await networkUtls.getPublicUrl();
    const internalApiUrl = networkUtls.getInternalApiUrl();

    const publicUrlObj = new URL(publicUrl);
    const internalUrlObj = new URL(internalApiUrl);
    const userUrlObj = new URL(userUrl);

    if (userUrlObj.origin !== publicUrlObj.origin) {
      throw error;
    }

    const internalBasePath = internalUrlObj.pathname.replace(/\/$/, '');
    let relativePath = userUrlObj.pathname;

    if (
      internalBasePath &&
      internalBasePath !== '/' &&
      relativePath.startsWith(internalBasePath)
    ) {
      relativePath = relativePath.slice(internalBasePath.length);
    }

    if (!relativePath.startsWith('/')) {
      relativePath = `/${relativePath}`;
    }

    if (!/^\/v1\/webhooks\/[0-9A-Za-z]{21}\/sync$/.test(relativePath)) {
      throw error;
    }

    const rewrittenPath = `${internalBasePath}${relativePath}`.replace(
      /\/{2,}/g,
      '/',
    );

    return `${internalUrlObj.origin}${rewrittenPath}`;
  }
}
