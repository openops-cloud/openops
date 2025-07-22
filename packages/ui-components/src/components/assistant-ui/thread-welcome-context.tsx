import React, { createContext, ReactNode, useContext, useMemo } from 'react';

export interface ThreadWelcomeData {
  greeting: string;
}

const ThreadWelcomeContext = createContext<ThreadWelcomeData | null>(null);

interface ThreadWelcomeProviderProps {
  greeting: string;
  children: ReactNode;
}

export const ThreadWelcomeProvider: React.FC<ThreadWelcomeProviderProps> = ({
  greeting,
  children,
}) => {
  const value: ThreadWelcomeData = useMemo(
    () => ({
      greeting,
    }),
    [greeting],
  );

  return (
    <ThreadWelcomeContext.Provider value={value}>
      {children}
    </ThreadWelcomeContext.Provider>
  );
};

export const useThreadWelcome = (): ThreadWelcomeData => {
  const context = useContext(ThreadWelcomeContext);
  if (!context) {
    throw new Error(
      'useThreadWelcome must be used within a ThreadWelcomeProvider',
    );
  }
  return context;
};
