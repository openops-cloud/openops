import { Shortcut, ShortcutProps } from '@openops/components/ui';
import { CanvasShortcutsProps } from './types';

export const CanvasShortcuts: CanvasShortcutsProps = {
  Paste: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'v',
  },
  Copy: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'c',
  },
};

export const ShortcutWrapper = ({
  children,
  shortcut,
}: {
  children: React.ReactNode;
  shortcut: ShortcutProps;
}) => {
  return (
    <div className="flex items-center justify-between gap-4 flex-grow">
      <div className="flex gap-2 items-center">{children}</div>
      <Shortcut {...shortcut} className="text-end" />
    </div>
  );
};
