import { isInputDOMNode, type KeyCode } from '@xyflow/system';
import { useEffect, useMemo, useRef, useState } from 'react';

type Keys = Array<string>;
type PressedKeys = Set<string>;
type KeyOrCode = 'key' | 'code';

export type UseKeyPressOptions = {
  target?: Window | Document | HTMLElement | ShadowRoot | null;
  actInsideInputWithModifier?: boolean;
  preventDefault?: boolean;
};

function isMatchingKey(
  keyCodes: Array<Keys>,
  pressedKeys: PressedKeys,
  isUp: boolean,
): boolean {
  return (
    keyCodes
      /*
       * we only want to compare same sizes of keyCode definitions
       * and pressed keys. When the user specified 'Meta' as a key somewhere
       * this would also be truthy without this filter when user presses 'Meta' + 'r'
       */
      .filter((keys) => isUp || keys.length === pressedKeys.size)
      /*
       * since we want to support multiple possibilities only one of the
       * combinations need to be part of the pressed keys
       */
      .some((keys) => keys.every((k) => pressedKeys.has(k)))
  );
}

function useKeyOrCode(eventCode: string, keysToWatch: KeyCode): KeyOrCode {
  return keysToWatch.includes(eventCode) ? 'code' : 'key';
}

const defaultDoc = typeof document !== 'undefined' ? document : null;

/**
 * This hook lets you listen for specific key codes and tells you whether they are
 * currently pressed or not.
 *
 * @public
 * @param param.keyCode - The key code (string or array of strings) to use
 * @param param.options - Options
 * @returns boolean
 *
 * @example
 * ```tsx
 *import { useKeyPress } from '@xyflow/react';
 *
 *export default function () {
 *  const spacePressed = useKeyPress('Space');
 *  const cmdAndSPressed = useKeyPress(['Meta+s', 'Strg+s']);
 *
 *  return (
 *    <div>
 *     {spacePressed && <p>Space pressed!</p>}
 *     {cmdAndSPressed && <p>Cmd + S pressed!</p>}
 *    </div>
 *  );
 *}
 *```
 */
export function useKeyPress(
  /*
   * the keycode can be a string 'a' or an array of strings ['a', 'a+d']
   * a string means a single key 'a' or a combination when '+' is used 'a+d'
   * an array means different possibilites. Explainer: ['a', 'd+s'] here the
   * user can use the single key 'a' or the combination 'd' + 's'
   */
  keyCode: KeyCode | null = null,
  options: UseKeyPressOptions = {
    target: defaultDoc,
    actInsideInputWithModifier: true,
  },
): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  // we need to remember if a modifier key is pressed in order to track it
  const modifierPressed = useRef(false);

  // we need to remember the pressed keys in order to support combinations
  const pressedKeys = useRef<PressedKeys>(new Set([]));

  /*
   * keyCodes = array with single keys [['a']] or key combinations [['a', 's']]
   * keysToWatch = array with all keys flattened ['a', 'd', 'ShiftLeft']
   * used to check if we store event.code or event.key. When the code is in the list of keysToWatch
   * we use the code otherwise the key. Explainer: When you press the left "command" key, the code is "MetaLeft"
   * and the key is "Meta". We want users to be able to pass keys and codes so we assume that the key is meant when
   * we can't find it in the list of keysToWatch.
   */
  const [keyCodes, keysToWatch] = useMemo<[Array<Keys>, Keys]>(() => {
    if (keyCode !== null) {
      const keyCodeArr = Array.isArray(keyCode) ? keyCode : [keyCode];
      const keys = keyCodeArr
        .filter((kc) => typeof kc === 'string')
        /*
         * we first replace all '+' with '\n'  which we will use to split the keys on
         * then we replace '\n\n' with '\n+', this way we can also support the combination 'key++'
         * in the end we simply split on '\n' to get the key array
         */
        .map((kc) => kc.replace('+', '\n').replace('\n\n', '\n+').split('\n'));
      const keysFlat = keys.reduce(
        (res: Keys, item) => res.concat(...item),
        [],
      );

      return [keys, keysFlat];
    }

    return [[], []];
  }, [keyCode]);

  useEffect(() => {
    setTimeout(() => {
      const target = options?.target || defaultDoc;

      if (keyCode !== null) {
        const downHandler = (event: KeyboardEvent) => {
          modifierPressed.current =
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
          const preventAction =
            (!modifierPressed.current ||
              (modifierPressed.current &&
                !options.actInsideInputWithModifier)) &&
            isInputDOMNode(event);

          if (preventAction) {
            return false;
          }
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const keyOrCode = useKeyOrCode(event.code, keysToWatch);
          pressedKeys.current.add(event[keyOrCode]);

          if (isMatchingKey(keyCodes, pressedKeys.current, false)) {
            const target = (event.composedPath?.()?.[0] ||
              event.target) as Element | null;
            const isInteractiveElement =
              target?.nodeName === 'BUTTON' || target?.nodeName === 'A';

            if (
              options.preventDefault !== false &&
              (modifierPressed.current || !isInteractiveElement)
            ) {
              event.preventDefault();
            }

            setKeyPressed(true);
          }
        };

        const upHandler = (event: KeyboardEvent) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const keyOrCode = useKeyOrCode(event.code, keysToWatch);

          if (isMatchingKey(keyCodes, pressedKeys.current, true)) {
            setKeyPressed(false);
            pressedKeys.current.clear();
          } else {
            pressedKeys.current.delete(event[keyOrCode]);
          }

          // fix for Mac: when cmd key is pressed, keyup is not triggered for any other key, see: https://stackoverflow.com/questions/27380018/when-cmd-key-is-kept-pressed-keyup-is-not-triggered-for-any-other-key
          if (event.key === 'Meta') {
            pressedKeys.current.clear();
          }

          modifierPressed.current = false;
        };

        const resetHandler = () => {
          pressedKeys.current.clear();
          setKeyPressed(false);
        };

        target?.addEventListener(
          'keydown',
          downHandler as EventListenerOrEventListenerObject,
        );
        target?.addEventListener(
          'keyup',
          upHandler as EventListenerOrEventListenerObject,
        );
        window.addEventListener('blur', resetHandler);
        window.addEventListener('contextmenu', resetHandler);

        return () => {
          target?.removeEventListener(
            'keydown',
            downHandler as EventListenerOrEventListenerObject,
          );
          target?.removeEventListener(
            'keyup',
            upHandler as EventListenerOrEventListenerObject,
          );
          window.removeEventListener('blur', resetHandler);
          window.removeEventListener('contextmenu', resetHandler);
        };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [keyCode, setKeyPressed, options.target]);

  return keyPressed;
}
