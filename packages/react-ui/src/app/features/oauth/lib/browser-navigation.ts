/**
 * Performs a full-page navigation to a URL outside the app's router.
 *
 * Kept as a separate module so tests can mock it: jsdom marks `window.location`
 * as non-configurable, so it cannot be replaced or spied on directly.
 */
export const navigateToExternalUrl = (url: string): void => {
  window.location.assign(url);
};
