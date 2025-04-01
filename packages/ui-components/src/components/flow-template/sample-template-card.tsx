import { cn } from '../../lib/cn';
import { BlockIconList } from '../block-icon/block-icon-list';
import { TemplateCardText } from './template-card-text';
import { FlowTemplateMetadataWithIntegrations } from './types';

type SampleTemplateCardProps = {
  templateMetadata: FlowTemplateMetadataWithIntegrations;
  onClick: () => void;
};

const SampleTemplateCard = ({
  templateMetadata,
  onClick,
}: SampleTemplateCardProps) => (
  <div
    onClick={onClick}
    className={cn(
      'w-full h-[169px] pt-4 pb-3 pl-[22px] pr-2 flex flex-col gap-2 bg-background rounded-sm border text-black dark:text-white cursor-pointer overflow-hidden',
      {
        'bg-secondary': !templateMetadata,
      },
    )}
    data-testid="get-started-template-card"
  >
    {templateMetadata && (
      <>
        <div className="flex justify-between">
          <BlockIconList
            metadata={templateMetadata.integrations}
            maxNumberOfIconsToShow={2}
          />
        </div>
        <TemplateCardText
          templateMetadata={templateMetadata}
          headerMaxLines={2}
          totalMaxLines={4}
          headerClassName="text-sm leading-5"
          descriptionClassName="text-xs leading-5 tracking-normal"
        />
      </>
    )}
  </div>
);
SampleTemplateCard.displayName = 'SampleTemplateCard';
export { SampleTemplateCard };
