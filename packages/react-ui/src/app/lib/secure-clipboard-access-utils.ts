/**
 * Whether the current page is served over HTTPS or if the hostname is "localhost".
 */
export const hasSecureClipboardAccess =
  window.location.protocol === 'https:' ||
  window.location.hostname === 'localhost';
