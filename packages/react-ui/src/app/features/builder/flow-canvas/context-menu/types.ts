import { ShortcutProps } from '@openops/components/ui';

export enum ContextMenuType {
  CANVAS = 'CANVAS',
  STEP = 'STEP',
}
export type CanvasShortcutsProps = Record<
  'Paste' | 'Delete' | 'Copy',
  ShortcutProps
>;
