import { Action } from '@openops/shared';
import { useState } from 'react';

export async function getActionsInClipboard(): Promise<Action | null> {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const request = JSON.parse(clipboardText);

    if (request?.name && request?.settings) {
      return request;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting actions in clipboard', error);
    return null;
  }

  return null;
}

export const usePasteActionsInClipboard = () => {
  const [actionToPaste, setActionToPaste] = useState<Action | null>(null);
  const fetchClipboardOperations = async () => {
    if (document.hasFocus()) {
      const clipboardAction = await getActionsInClipboard();
      if (clipboardAction) {
        setActionToPaste(clipboardAction);
      } else {
        setActionToPaste(null);
      }
    }
  };
  return { actionToPaste, fetchClipboardOperations };
};
