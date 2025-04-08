import { CreateNewFlowInFolder } from '@/app/features/flows/components/create-new-flow-in-folder';
import { ImportFlowDialog } from '@/app/features/flows/components/import-flow-dialog/import-flow-dialog';
import { SelectFlowTemplateDialog } from '@/app/features/templates/components/select-flow-template-dialog';
import { Button, PageHeader } from '@openops/components/ui';
import { t } from 'i18next';
import { Import, LayoutTemplate } from 'lucide-react';
import { ReactNode, useState } from 'react';

const FlowsPageHeader = ({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) => {
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] =
    useState<boolean>(false);

  return (
    <div className="mb-2">
      <PageHeader title={title}>
        <div className="ml-auto flex flex-row gap-2 pr-7">
          {children}
          <ImportFlowDialog>
            <Button variant="outline" className="flex gap-2 items-center">
              <Import className="w-4 h-4" />
              {t('Import Workflow')}
            </Button>
          </ImportFlowDialog>
          <Button
            variant="outline"
            className="flex gap-2 items-center"
            onClick={() => setIsTemplatesDialogOpen(true)}
          >
            <LayoutTemplate />
            {t('Explore templates')}
          </Button>

          <SelectFlowTemplateDialog
            isOpen={isTemplatesDialogOpen}
            onOpenChange={setIsTemplatesDialogOpen}
          />
          <CreateNewFlowInFolder />
        </div>
      </PageHeader>
    </div>
  );
};

FlowsPageHeader.displayName = 'FlowsPageHeader';
export { FlowsPageHeader };
