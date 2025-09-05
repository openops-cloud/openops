export const MiddleMouseButtonClickEvent = 1;

export function isModifierOrMiddleClick(
  e: Pick<React.MouseEvent, 'ctrlKey' | 'metaKey' | 'button'>,
): boolean {
  return e.ctrlKey || e.metaKey || e.button === MiddleMouseButtonClickEvent;
}
