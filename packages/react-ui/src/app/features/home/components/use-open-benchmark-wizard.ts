import { useAppStore } from '@/app/store/app-store';
import { useCallback } from 'react';

export const useOpenBenchmarkWizard = () => {
  const setIsBenchmarkWizardOpen = useAppStore(
    (s) => s.setIsBenchmarkWizardOpen,
  );

  const openBenchmarkWizard = useCallback(() => {
    const { isAiChatOpened, setIsAiChatOpened } = useAppStore.getState();
    if (isAiChatOpened) {
      setIsAiChatOpened(false);
    }
    setIsBenchmarkWizardOpen(true);
  }, [setIsBenchmarkWizardOpen]);

  return openBenchmarkWizard;
};
