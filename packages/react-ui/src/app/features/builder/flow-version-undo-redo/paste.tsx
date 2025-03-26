import { useClipboardContext } from '@openops/components/ui';
import { useEffect } from 'react';
import { useKeyboardPasteShortcut } from '../flow-canvas/keyboard-paste-shortcut';
import { usePageVisibility } from '../hooks/use-page-visibility';

const Paste = () => {
  // cannot be used in BuilderPage directly because it requires ReactFlowProvider
  useKeyboardPasteShortcut();

  const { fetchClipboardOperations } = useClipboardContext();

  const isVisible = usePageVisibility();

  useEffect(() => {
    if (isVisible) {
      fetchClipboardOperations();
    }
  }, [fetchClipboardOperations, isVisible]);
  return null;
};

Paste.displayName = 'Paste';
export { Paste };
