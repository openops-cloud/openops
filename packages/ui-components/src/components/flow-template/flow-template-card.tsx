import { BlockIcon } from '../block-icon/block-icon';
import { BlockIconList } from '../block-icon/block-icon-list';
import { TemplateCardText } from './template-card-text';
import { FlowTemplateMetadataWithIntegrations } from './types';

type FlowTemplateCardProps = {
  templateMetadata: FlowTemplateMetadataWithIntegrations;
  showAuthor: boolean;
  ownerLogoUrl?: string;
  onClick: () => void;
};

const FlowTemplateCard = ({
  templateMetadata,
  showAuthor,
  //Will be removed
  ownerLogoUrl = 'https://static.openops.com/logos/logo.icon.positive.svg',
  onClick,
}: FlowTemplateCardProps) => {
  return (
    <div
      onClick={onClick}
      className="w-[327px] h-[211px] p-[22px] flex flex-col gap-[7px] bg-background rounded-2xl border text-black dark:text-white text-base shadow-template cursor-pointer overflow-hidden"
      data-testid="template-card"
    >
      <BlockIconList
        size="lg"
        metadata={templateMetadata.integrations}
        maxNumberOfIconsToShow={4}
      />
      <TemplateCardText templateMetadata={templateMetadata} />
      <div className="flex items-center gap-[6px] !mt-auto">
        {showAuthor && (
          <>
            <BlockIcon
              showTooltip={false}
              logoUrl={ownerLogoUrl}
              circle={true}
              size={'sm'}
              className="p-1 bg-blue-50"
            ></BlockIcon>
            <span>By OpenOps</span>
          </>
        )}
      </div>
    </div>
  );
};

FlowTemplateCard.displayName = 'FlowTemplateCard';
export { FlowTemplateCard };
