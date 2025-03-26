import { useKeyboardPasteShortcut } from './hooks/keyboard-paste-shortcut';

const Paste = () => {
  // cannot be used in BuilderPage directly because it requires ReactFlowProvider
  useKeyboardPasteShortcut();

  return null;
};

Paste.displayName = 'Paste';
export { Paste };
