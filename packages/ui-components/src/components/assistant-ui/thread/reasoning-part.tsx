import { LoaderPinwheelIcon } from 'lucide-react';
import { FC } from 'react';
import { ExpandableContent } from '../../expandable-markdown';

type ReasoningPartProps = {
  text: string;
};

export const ReasoningPart: FC<ReasoningPartProps> = ({ text }) => {
  return (
    <div className="my-2">
      <ExpandableContent
        fullContent={text}
        buttonClassName="text-sm ml-6 font-normal"
      >
        {(content) => (
          <div className="flex items-start gap-2 pt-2">
            <LoaderPinwheelIcon className="h-4 w-4 flex-shrink-0 text-border-300 dark:text-blue-400 mt-0.5" />
            <div className="flex-grow">
              <div className="text-sm text-primary-700 dark:text-blue-100 whitespace-pre-wrap">
                {content}
              </div>
            </div>
          </div>
        )}
      </ExpandableContent>
    </div>
  );
};
