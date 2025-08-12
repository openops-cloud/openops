import { t } from 'i18next';
import { CircleCheck } from 'lucide-react';

type RunWorkflowManuallySuccessToastContentProps = {
  url: string;
};

const RunWorkflowManuallySuccessToastContent = ({
  url,
}: RunWorkflowManuallySuccessToastContentProps) => (
  <div className="flex items-center gap-2">
    <CircleCheck size={18} className={'text-success dark:text-success-300'} />
    <div className="flex flex-col dark:text-primary">
      <p className="text-sm font-normal">
        {t('Workflow triggered successfully.')}
      </p>
      <a
        href={url}
        target="_blank"
        className="text-sm font-normal"
        rel="noreferrer"
      >
        {t('Check the Runs page for details')}
      </a>
    </div>
  </div>
);

RunWorkflowManuallySuccessToastContent.displayName =
  'RunWorkflowManuallySuccessToastContent';

const getRunWorkflowManuallySuccessToast = (url: string) => ({
  id: 'run-workflow-manually-success-toast',
  title: '',
  description: <RunWorkflowManuallySuccessToastContent url={url} />,
  variant: 'default',
  duration: 10000,
  className: 'w-fit self-end p-3 pr-8',
});

export {
  getRunWorkflowManuallySuccessToast,
  RunWorkflowManuallySuccessToastContent,
};
