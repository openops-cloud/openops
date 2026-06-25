/**
 * Pure-JS base64 polyfill bootstrapped into every isolate so user code blocks can use the
 * web-standard `btoa`/`atob`. A bare V8 isolate exposes neither these nor Node's `Buffer`, so
 * code such as `btoa(JSON.stringify(body))` would otherwise throw `ReferenceError`. The bootstrap
 * runs entirely inside the isolate (no host-function injection), so it adds no new attack surface,
 * and it is additive — the `typeof` guards only define globals that are not already present.
 */
export const BASE64_POLYFILL = `(() => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  if (typeof globalThis.btoa !== 'function') {
    globalThis.btoa = (input) => {
      const string = String(input);
      let output = '';

      for (let i = 0; i < string.length; i += 3) {
        const a = string.charCodeAt(i);
        const b = string.charCodeAt(i + 1);
        const c = string.charCodeAt(i + 2);

        if (a > 255 || b > 255 || c > 255) {
          throw new TypeError(
            "Failed to execute 'btoa': the string to be encoded contains characters outside of the Latin1 range."
          );
        }

        const hasB = i + 1 < string.length;
        const hasC = i + 2 < string.length;

        const bitmap = (a << 16) | ((hasB ? b : 0) << 8) | (hasC ? c : 0);

        output += chars[(bitmap >> 18) & 63];
        output += chars[(bitmap >> 12) & 63];
        output += hasB ? chars[(bitmap >> 6) & 63] : '=';
        output += hasC ? chars[bitmap & 63] : '=';
      }

      return output;
    };
  }

  if (typeof globalThis.atob !== 'function') {
    globalThis.atob = (input) => {
      let string = String(input).replace(/[\\t\\n\\f\\r ]+/g, '');

      if (string.length % 4 === 1) {
        throw new TypeError(
          "Failed to execute 'atob': the string to be decoded is not correctly encoded."
        );
      }

      if (!/^[A-Za-z0-9+\\/]*={0,2}$/.test(string) || /=(?=.*[^=])/.test(string)) {
        throw new TypeError(
          "Failed to execute 'atob': the string to be decoded is not correctly encoded."
        );
      }

      while (string.length % 4 !== 0) {
        string += '=';
      }

      let output = '';

      for (let i = 0; i < string.length; i += 4) {
        const e1 = chars.indexOf(string[i]);
        const e2 = chars.indexOf(string[i + 1]);
        const e3 = string[i + 2] === '=' ? 64 : chars.indexOf(string[i + 2]);
        const e4 = string[i + 3] === '=' ? 64 : chars.indexOf(string[i + 3]);

        if (e1 < 0 || e2 < 0 || e3 < 0 || e4 < 0) {
          throw new TypeError(
            "Failed to execute 'atob': the string to be decoded is not correctly encoded."
          );
        }

        const bitmap = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63);

        output += String.fromCharCode((bitmap >> 16) & 255);

        if (e3 !== 64) {
          output += String.fromCharCode((bitmap >> 8) & 255);
        }

        if (e4 !== 64) {
          output += String.fromCharCode(bitmap & 255);
        }
      }

      return output;
    };
  }
})();`;
