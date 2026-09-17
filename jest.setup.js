// Mock langfuse-vercel to prevent dynamic import errors in Jest
jest.mock('langfuse-vercel', () => ({
  LangfuseExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

/**
 * Workaround for a jsdom selector-engine bug that makes Radix poppers take
 * ~8 s to open under Jest.
 *
 * nwsapi 2.2.25+ (the selector engine bundled with jsdom) implements the
 * top-layer pseudo-classes by delegating to `element.matches()`, which under
 * jsdom is nwsapi again, so every `matches(':modal')` recurses until the stack
 * overflows (~150 ms each, swallowed by a try/catch). `@floating-ui/utils`
 * calls `matches(':popover-open')` and `matches(':modal')` for every offset
 * parent while positioning a popper, which is what pushes DropdownMenu /
 * Popover tests past the 5 s default timeout.
 *
 * jsdom has no top layer at all (no popover API, no showModal(), no
 * fullscreen, no picture-in-picture), so `false` is the correct answer for
 * these selectors. Everything else is delegated untouched. `:open`/`:closed`
 * are deliberately left alone because nwsapi handles those correctly.
 *
 * Guarded on `Element` so the node-environment projects that share this setup
 * file are unaffected. Remove once jest-environment-jsdom ships a jsdom whose
 * nwsapi includes the fix for https://github.com/dperini/nwsapi/issues/214.
 */
if (typeof Element !== 'undefined') {
  const TOP_LAYER_PSEUDO_CLASSES = new Set([
    ':modal',
    ':popover-open',
    ':fullscreen',
    ':picture-in-picture',
  ]);
  const originalMatches = Element.prototype.matches;

  Element.prototype.matches = function matches(selectors) {
    if (TOP_LAYER_PSEUDO_CLASSES.has(selectors)) {
      return false;
    }
    return originalMatches.call(this, selectors);
  };
}
