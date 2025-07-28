import { t } from 'i18next';
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { CodeVariations } from '../custom';

interface ThreadExtraContextProviderProps {
  greeting?: string;
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string) => void;
  children: ReactNode;
}

export type ThreadExtraData = Omit<ThreadExtraContextProviderProps, 'children'>;
const ThreadExtraContext = createContext<ThreadExtraData | null>(null);

export const ThreadExtraContextProvider: React.FC<
  ThreadExtraContextProviderProps
> = ({ greeting, codeVariation, handleInject, children }) => {
  const value: ThreadExtraData = useMemo(
    () => ({
      greeting: greeting ?? t('How can I help you today?'),
      codeVariation,
      handleInject,
    }),
    [codeVariation, greeting, handleInject],
  );

  return (
    <ThreadExtraContext.Provider value={value}>
      {children}
    </ThreadExtraContext.Provider>
  );
};

export const useThreadExtraContext = (): ThreadExtraData => {
  const context = useContext(ThreadExtraContext);
  if (!context) {
    throw new Error(
      'useThreadExtraContext must be used within a ThreadExtraContextProvider',
    );
  }
  return context;
};
