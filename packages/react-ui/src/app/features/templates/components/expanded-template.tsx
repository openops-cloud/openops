import {
  Button,
  CanvasControls,
  OverflowTooltip,
  TemplateCanvas,
  TemplateCanvasProps,
} from '@openops/components/ui';
import { Permission } from '@openops/shared';

import { PermissionGuard } from '@/app/common/components/permission-guard';
import { TEMPLATE_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import { t } from 'i18next';
import { ArrowLeft, PencilLine } from 'lucide-react';

type ExpandedTemplateProps = TemplateCanvasProps & {
  templateName: string;
  close: () => void;
  useTemplate: () => void;
};

const ExpandedTemplate = ({
  templateName,
  edgeTypes,
  nodeTypes,
  template,
  close,
  useTemplate,
}: ExpandedTemplateProps) => {
  return (
    <div className="w-full h-full flex flex-col gap-[27px] p-[27px] pt-8">
      <div className="w-full flex items-center justify-between gap-5 pr-5">
        <ArrowLeft
          role="button"
          scale={1}
          onClick={close}
          className="w-6 h-6"
        ></ArrowLeft>
        <OverflowTooltip
          className="flex-1 text-[32px] font-bold text-primary-300 dark:text-primary text-center"
          text={templateName}
        ></OverflowTooltip>
        <PermissionGuard permission={Permission.WRITE_FLOW}>
          <Button
            className="flex gap-2 items-center justify-end ml-auto"
            onClick={useTemplate}
          >
            <PencilLine />
            {t('Use template')}
          </Button>
        </PermissionGuard>
      </div>
      <div className="flex-1 rounded-2xl overflow-hidden border">
        <TemplateCanvas
          template={template}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          topOffset={TEMPLATE_CANVAS_Y_OFFESET}
        >
          <CanvasControls topOffset={TEMPLATE_CANVAS_Y_OFFESET} />
        </TemplateCanvas>
      </div>
    </div>
  );
};

ExpandedTemplate.displayName = 'ExpandedTemplate';
export { ExpandedTemplate };
