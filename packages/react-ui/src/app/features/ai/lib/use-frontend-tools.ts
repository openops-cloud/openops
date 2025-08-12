import { UI_KIT_PACKAGE_NAME } from '@/app/constants/ui-kit';
import { ReactNode, useEffect, useState } from 'react';

export const useFrontendTools = () => {
  const [toolComponents, setToolComponents] = useState<
    Record<string, ReactNode> | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const { createFrontendTools } = await import(
          /* @vite-ignore */ UI_KIT_PACKAGE_NAME
        );
        const tools = createFrontendTools();
        setToolComponents(tools);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('UI tools are not available in the open source version');
      } finally {
        setIsLoading(false);
      }
    };

    loadTools();
  }, []);

  return { toolComponents, isLoading };
};
