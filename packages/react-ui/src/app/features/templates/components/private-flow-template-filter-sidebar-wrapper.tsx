import { FlowTemplateFilterItem } from '@openops/components/ui';
import { t } from 'i18next';
import React from 'react';

const PrivateFlowTemplateFilterSidebarWrapper = () => {
  return (
    <div className="rounded-2xl flex-col justify-start items-start inline-flex h-full w-full px-4 pt-[25px] pb-8 bg-background">
      <FlowTemplateFilterItem
        value={''}
        displayName={t('All Templates')}
        onClick={() => {}}
        isActive={true}
      />
    </div>
  );
};

PrivateFlowTemplateFilterSidebarWrapper.displayName =
  'PrivateFlowTemplateFilterSidebarWrapper';

export { PrivateFlowTemplateFilterSidebarWrapper };
