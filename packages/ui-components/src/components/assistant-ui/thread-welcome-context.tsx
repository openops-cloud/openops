import React, { createContext, ReactNode, useContext } from 'react';

export interface ThreadWelcomeData {
  greeting: string;
  suggestions: { prompt: string; label: string }[];
}

const ThreadWelcomeContext = createContext<ThreadWelcomeData | null>(null);

interface ThreadWelcomeProviderProps {
  greeting: string;
  suggestions: { prompt: string; label: string }[];
  children: ReactNode;
}

export const ThreadWelcomeProvider: React.FC<ThreadWelcomeProviderProps> = ({
  greeting,
  suggestions,
  children,
}) => {
  const value: ThreadWelcomeData = {
    greeting,
    suggestions,
  };

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
