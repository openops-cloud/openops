import { useClipboardContext } from '@openops/components/ui';
import { useEffect } from 'react';
import { usePageVisibility } from '../hooks/use-page-visibility';
import { useKeyboardPasteShortcut } from './hooks/keyboard-paste-shortcut';

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
