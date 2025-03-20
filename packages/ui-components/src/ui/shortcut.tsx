import { cn } from '../lib/cn';
import { isMacUserAgent } from '../lib/user-agent-utils';

export type ShortcutProps = {
  shortcutKey: string;
  withCtrl?: boolean;
  withShift?: boolean;
};

export const Shortcut = ({
  shortcutKey,
  withCtrl,
  withShift,
  className,
}: ShortcutProps & { className?: string }) => {
  const isMac = isMacUserAgent();
  const isEscape = shortcutKey.toLocaleLowerCase() === 'esc';
  return (
    <span
      className={cn(
        'flex-grow text-xs tracking-widest text-muted-foreground',
        className,
      )}
    >
      {!isEscape && withCtrl && (isMac ? '⌘' : 'Ctrl')}
      {!isEscape && withShift && 'Shift'}
      {!isEscape && (withCtrl || withShift) && ' + '}
      {shortcutKey && toTitleCase(shortcutKey)}
    </span>
  );
};

const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
