import {
  DismissiblePanel,
  FlowTemplateMetadataWithIntegrations,
  SampleTemplateCard,
} from '@openops/components/ui';
import { t } from 'i18next';

type HomeGetStartedProps = {
  sampleTemplates: FlowTemplateMetadataWithIntegrations[];
  onSampleTemplateClick: (
    template: FlowTemplateMetadataWithIntegrations,
  ) => void;
  close: () => void;
};

const HomeGetStarted = ({
  sampleTemplates,
  onSampleTemplateClick,
  close,
}: HomeGetStartedProps) => {
  return (
    <DismissiblePanel
      className="min-h-fit h-fit"
      closeTooltip={t('Close')}
      onClose={close}
      buttonClassName="size-6 top-[26px]"
    >
      <div className="p-6 flex flex-col gap-4 bg-secondary font-bold">
        <h2 className="text-[24px]">{t('Get started')}</h2>
        <div className="flex items-center justify-between gap-2 flex-wrap @[1170px]:flex-nowrap @[1200px]:gap-10">
          <div className="w-full flex flex-col gap-4">
            <h3>{t('Start with our Sample template')}</h3>
            <div className="flex gap-4 font-normal">
              {sampleTemplates && (
                <>
                  <SampleTemplateCard
                    templateMetadata={sampleTemplates[0]}
                    onClick={() => {
                      onSampleTemplateClick(sampleTemplates[0]);
                    }}
                  ></SampleTemplateCard>

                  <SampleTemplateCard
                    templateMetadata={sampleTemplates[1]}
                    onClick={() => {
                      onSampleTemplateClick(sampleTemplates[1]);
                    }}
                  ></SampleTemplateCard>
                </>
              )}
            </div>
          </div>
          {/* <div className="w-full flex flex-col gap-4">
            <h3>{t('Quick links')}</h3>
            <div className="w-full h-[169px] flex gap-4 font-normal">
              <KnowledgeBaseCard
                link=""
                text={t('What is OpenOps?')}
                icon={<BookOpenText size={20} />}
                iconWrapperClassName="bg-warning"
              />
              <KnowledgeBaseCard
                link=""
                text={t('Features and benefits')}
                icon={<BookOpenText size={20} />}
                iconWrapperClassName="bg-blue-500"
              />
              <KnowledgeBaseCard
                link=""
                text={t('Quick start guide')}
                icon={<BookOpenText size={20} />}
                iconWrapperClassName="bg-warning-200"
              />
              <KnowledgeBaseCard
                link=""
                text={t('Community')}
                icon={<BookOpenText size={20} />}
                iconWrapperClassName="bg-teal-400"
              />
            </div>
          </div> */}
        </div>
      </div>
    </DismissiblePanel>
  );
};

HomeGetStarted.displayName = 'HomeGetStarted';
export { HomeGetStarted };
