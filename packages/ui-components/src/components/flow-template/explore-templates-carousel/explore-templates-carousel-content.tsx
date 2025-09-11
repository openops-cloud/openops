import { CarouselItem } from '../../../ui/carousel';
import { FlowTemplateCard } from '../flow-template-card';
import { FlowTemplateMetadataWithIntegrations } from '../types';

export type ExploreTemplatesCarouselContentProps = {
  templates: FlowTemplateMetadataWithIntegrations[] | undefined;
  onTemplateClick: (template: FlowTemplateMetadataWithIntegrations) => void;
};

const ExploreTemplatesCarouselContent = ({
  templates,
  onTemplateClick,
}: ExploreTemplatesCarouselContentProps) => {
  if (!templates || !templates.length) {
    return Array.from({ length: 10 }).map((_, index) => (
      <CarouselItem key={index} className="w-[327px]">
        <div className="w-[327px] h-[211px] rounded-2xl bg-secondary"></div>
      </CarouselItem>
    ));
  }

  return templates.map((template) => (
    <CarouselItem key={template.id} className="w-[327px] flex-none">
      <FlowTemplateCard
        showAuthor={true}
        templateMetadata={template}
        onClick={() => onTemplateClick(template)}
      />
    </CarouselItem>
  ));
};

ExploreTemplatesCarouselContent.displayName = 'ExploreTemplatesCarouselContent';
export { ExploreTemplatesCarouselContent };
