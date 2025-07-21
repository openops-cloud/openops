import { useDebounceCallback } from 'usehooks-ts';

export const useResizablePanelGroup = () => {
  const setPanelsSize = useDebounceCallback(
    (sizes: { [key: string]: number }) => {
      Object.entries(sizes)
        .filter(([_, size]) => {
          return !!size;
        })
        .forEach(([name, size]) => {
          localStorage.setItem(name, JSON.stringify(size));
        });
    },
    300,
  );

  const getPanelSize = (name: string): number => {
    const sizeJson = localStorage.getItem(name);
    if (!sizeJson) {
      return 0;
    }
    try {
      return Number(sizeJson);
    } catch {
      return 0;
    }
  };

  return { setPanelsSize, getPanelSize };
};
