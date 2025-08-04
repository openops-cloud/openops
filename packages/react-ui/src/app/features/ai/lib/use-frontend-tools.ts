import { useEffect, useState } from 'react';

export const useFrontendTools = () => {
  const [toolComponents, setToolComponents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const packageName = '@openops/ui-kit';
        const { createFrontendTools } = await import(packageName);
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
