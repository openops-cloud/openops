import { Action } from '@openops/shared';
import { createContext, useContext } from 'react';

type ClipboardContextState = {
  actionToPaste: Action | null;
  setActionToPaste: (actionToPaste: Action | null) => void;
};

const ClipboardContext = createContext<ClipboardContextState | undefined>(
  undefined,
);

export const useClipboardContext = () => {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error(
      'useClipboardContext must be used within a ClipboardContextProvider',
    );
  }
  return context;
};
