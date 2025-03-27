import { t } from 'i18next';
import { CircleCheckBig } from 'lucide-react';
import { toast } from '../../ui/use-toast';

type CopyPasteToastProps = {
  success: boolean;
  isCopy: boolean;
  itemsCount: number;
};

const CopyPasteToastContent = ({
  success,
  isCopy,
  itemsCount,
}: CopyPasteToastProps) => {
  if (success) {
    return (
      <>
        <CircleCheckBig size={24} className="text-greenAccent-300" />
        <span className="font-bold text-normal">
          {t(
            isCopy
              ? '{n} Steps copied to clipboard'
              : '{n} Steps successfully pasted',
            { n: itemsCount },
          )}
        </span>
      </>
    );
  } else {
    return (
      <>
        <CircleCheckBig size={24} className="text-warning-400" />
        <span className="font-bold text-normal">
          {t(
            isCopy ? 'Failed to copy {n} steps' : 'Failed to paste {n} steps',
            { n: itemsCount },
          )}
        </span>
      </>
    );
  }
};

export const copyPasteToast = (props: CopyPasteToastProps) => {
  return toast({
    description: (
      <div className="flex items-center gap-[10px]">
        <CopyPasteToastContent {...props} />
      </div>
    ),
    closeButtonClassName: 'top-6 right-4 opacity-1 text-black dark:text-white',
    duration: 7000,
  });
};
