import { useKeyPress } from '@xyflow/react';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { SHIFT_KEY, SPACE_KEY } from './constants';

export type PanningMode = 'grab' | 'pan';

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: React.Dispatch<React.SetStateAction<PanningMode>>;
};

const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

export const CanvasContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [panningMode, setPanningMode] = useState<PanningMode>('grab');

  const spacePressed = useKeyPress(SPACE_KEY);
  const shiftPressed = useKeyPress(SHIFT_KEY);

  const effectivePanningMode: PanningMode = useMemo(() => {
    if ((spacePressed || panningMode === 'grab') && !shiftPressed) {
      return 'grab';
    } else if ((shiftPressed || panningMode === 'pan') && !spacePressed) {
      return 'pan';
    }
    return 'grab';
  }, [panningMode, shiftPressed, spacePressed]);

  const contextValue = useMemo(
    () => ({
      panningMode: effectivePanningMode,
      setPanningMode,
    }),
    [effectivePanningMode],
  );
  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error(
      'useCanvasContext must be used within a CanvasContextProvider',
    );
  }
  return context;
};
