import { Action } from '@openops/shared';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type ClipboardContextState = {
  actionToPaste: Action | null;
  fetchClipboardOperations: () => Promise<void>;
};

const ClipboardContext = createContext<ClipboardContextState | undefined>(
  undefined,
);

async function getActionsInClipboard(): Promise<Action | null> {
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

export const ClipboardContextProvider = ({
  children,
  copyPasteActionsEnabled = true,
}: {
  children: ReactNode;
  copyPasteActionsEnabled?: boolean;
}) => {
  const [actionToPaste, setActionToPaste] = useState<Action | null>(null);
  const fetchClipboardOperations = async () => {
    if (document.hasFocus() && copyPasteActionsEnabled) {
      const clipboardAction = await getActionsInClipboard();
      if (clipboardAction) {
        setActionToPaste(clipboardAction);
      } else {
        setActionToPaste(null);
      }
    }
  };

  const contextValue = useMemo(
    () => ({
      actionToPaste,
      fetchClipboardOperations,
    }),
    [actionToPaste],
  );

  return (
    <ClipboardContext.Provider value={contextValue}>
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboardContext = () => {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error(
      'useClipboardContext must be used within a ClipboardContextProvider',
    );
  }
  return context;
};
