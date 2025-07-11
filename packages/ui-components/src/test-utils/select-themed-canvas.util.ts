import { within } from '@storybook/test';

export function selectLightOrDarkCanvas(canvasElement: HTMLElement) {
  return within(
    canvasElement.querySelector('.light') ??
      canvasElement.querySelector('.dark')!,
  );
}
