import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type PanningMode = 'grab' | 'pan';

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: (panningMode: PanningMode) => void;
};

const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

const DEFAULT_PANNING_MODE_KEY_IN_LOCAL_STORAGE = 'defaultPanningMode';

function getPanningModeFromLocalStorage(): PanningMode {
  return localStorage.getItem(DEFAULT_PANNING_MODE_KEY_IN_LOCAL_STORAGE) ===
    'pan'
    ? 'pan'
    : 'grab';
}

function setPanningModeFromLocalStorage(mode: PanningMode) {
  localStorage.setItem(DEFAULT_PANNING_MODE_KEY_IN_LOCAL_STORAGE, mode);
}

export const CanvasContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const initialPanningMode = getPanningModeFromLocalStorage();

  const onSetPanningMode = useCallback((mode: PanningMode) => {
    setPanningMode(mode);
    setPanningModeFromLocalStorage(mode);
  }, []);

  const [panningMode, setPanningMode] =
    useState<PanningMode>(initialPanningMode);

  const contextValue = useMemo(
    () => ({
      panningMode,
      setPanningMode: onSetPanningMode,
    }),
    [panningMode, onSetPanningMode],
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
