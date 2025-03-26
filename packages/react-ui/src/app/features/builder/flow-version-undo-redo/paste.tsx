import { useKeyboardPasteShortcut } from './hooks/keyboard-paste-shortcut';

const Paste = () => {
  //needs ReactFlowProvider
  useKeyboardPasteShortcut();

  return null;
};

Paste.displayName = 'Paste';
export { Paste };
