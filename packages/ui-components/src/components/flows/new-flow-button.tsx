import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { Button, ButtonProps } from '../../ui/button';

type NewFlowButtonProps = Pick<ButtonProps, 'loading' | 'disabled' | 'onClick'>;

const NewFlowButton = ({ loading, disabled, onClick }: NewFlowButtonProps) => (
  <Button
    variant="default"
    className="flex gap-2 items-center"
    loading={loading}
    disabled={disabled}
    onClick={onClick}
  >
    <Plus />
    <span>{t('New Workflow')}</span>
  </Button>
);

NewFlowButton.displayName = 'NewFlowButton';

export { NewFlowButton, NewFlowButtonProps };
