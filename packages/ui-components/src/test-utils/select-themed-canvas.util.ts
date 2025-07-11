import { within } from '@storybook/test';

export function selectLightOrDarkCanvas(canvasElement: HTMLElement) {
  return within(
    canvasElement.querySelector('.light') ??
      canvasElement.querySelector('.dark')!,
  );
}

export function getThemeFromCanvas(
  canvasElement: HTMLElement,
): 'light' | 'dark' {
  if (canvasElement.querySelector('.light')) {
    return 'light';
  } else if (canvasElement.querySelector('.dark')) {
    return 'dark';
  }
  // Default to light if no theme class is found
  return 'light';
}

export function getThemeFromDocument(): 'light' | 'dark' {
  // Check document body or document element for theme class
  if (
    document.body.classList.contains('dark') ||
    document.documentElement.classList.contains('dark')
  ) {
    return 'dark';
  }
  return 'light';
}
