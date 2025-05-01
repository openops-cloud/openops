import { LEFT_SIDEBAR_MIN_SIZE } from '@/app/constants/sidebar';
import { useDebounceCallback } from 'usehooks-ts';
import { PanelSizes } from '../types/panel-sizes';

export const useResizablePanelGroup = () => {
  const setPanelGroupSize = useDebounceCallback(
    (name: string, size: PanelSizes) => {
      localStorage.setItem(name, JSON.stringify(size));
    },
    300,
  );

  const getPanelGroupSize = (name: string): PanelSizes => {
    const fallback: PanelSizes = [LEFT_SIDEBAR_MIN_SIZE, 85];
    const sizeJson = localStorage.getItem(name);
    if (!sizeJson) {
      return fallback;
    }
    return safeParseWithFallback(sizeJson, fallback);
  };

  return { setPanelGroupSize, getPanelGroupSize };
};

const safeParseWithFallback = (
  value: string,
  fallback: PanelSizes,
): PanelSizes => {
  if (!value) {
    return fallback;
  }

  let parsedValue: PanelSizes;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      parsedValue = parsed as PanelSizes;
    } else {
      parsedValue = fallback;
    }
  } catch (e) {
    console.error(e);
    parsedValue = fallback;
  }

  return parsedValue.length >= 2 ? parsedValue : fallback;
};
