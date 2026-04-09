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
    const internalUrl = new URL(networkUtls.getInternalApiUrl());
    const escapedBase = publicUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(
      `^${escapedBase}v1/webhooks/[0-9a-zA-Z]{21}/sync$`,
    );

    if (!regex.test(userUrl)) {
      throw error;
    }

    const userUrlObj = new URL(userUrl);
    const publicUrlObj = new URL(publicUrl);

    if (userUrlObj.origin !== publicUrlObj.origin) {
      return userUrl;
    }

    userUrlObj.protocol = internalUrl.protocol;
    userUrlObj.hostname = internalUrl.hostname;
    userUrlObj.port = internalUrl.port;

    const publicBasePath = publicUrlObj.pathname.replace(/\/$/, '');

    if (
      publicBasePath &&
      publicBasePath !== '/' &&
      userUrlObj.pathname.startsWith(publicBasePath)
    ) {
      const newPath = userUrlObj.pathname.slice(publicBasePath.length);
      userUrlObj.pathname = newPath.startsWith('/') ? newPath : `/${newPath}`;
    }

    return userUrlObj.toString();
  }
}
