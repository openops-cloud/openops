import { Button, FOLDER_ID_PARAM_NAME } from '@openops/components/ui';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

export const ViewBenchmarkWorkflowsButton = ({
  folderId,
  className,
}: {
  folderId: string;
  className?: string;
}) => {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => navigate(`/flows?${FOLDER_ID_PARAM_NAME}=${folderId}`)}
    >
      {t('View Workflows')}
    </Button>
  );
};

ViewBenchmarkWorkflowsButton.displayName = 'ViewBenchmarkWorkflowsButton';
