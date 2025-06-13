import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { LoadingSpinner, WarningWithIcon } from '@openops/components/ui';
import { MinimalFlow } from '@openops/shared';
import { t } from 'i18next';
import { ReactNode } from 'react';

type DeleteConnectionDialogContentProps = {
  isPending: boolean;
  linkedFlows: MinimalFlow[];
};

const DeleteConnectionDialogContent = ({
  isPending,
  linkedFlows,
}: DeleteConnectionDialogContentProps) => {
  if (isPending) {
    return (
      <div className="flex items-center justify-center">
        <LoadingSpinner
          size={60}
          className="stroke-primary-300 dark:stroke-primary"
        />
      </div>
    );
  }

  return linkedFlows.length ? (
    <div className="text-primary-300 dark:text-primary font-medium">
      <span>
        {t('This connection is used in {n} workflow(s):', {
          n: linkedFlows.length,
        })}
      </span>
      <ul className="ml-7 list-disc break-words">
        {linkedFlows.slice(0, 5).map((minimalFlow) => (
          <li key={minimalFlow.id}>{minimalFlow.displayName}</li>
        ))}
      </ul>
      {linkedFlows.length > 5 && (
        <span className="ml-2">
          {t('+ {n} other workflow(s)', {
            n: <span className="italic">{linkedFlows.length - 5}</span>,
          })}
        </span>
      )}
      <WarningWithIcon
        message={t('All workflows using this connection will fail')}
        className="mt-4"
      />
    </div>
  ) : (
    <span className="text-primary-300 dark:text-primary font-medium">
      {t(
        'This connection is not used by any workflow and can be safely deleted.',
      )}
    </span>
  );
};

type DeleteConnectionDialogProps = DeleteConnectionDialogContentProps & {
  connectionName: string;
  mutationFn: () => Promise<void>;
  children: ReactNode;
};

const DeleteConnectionDialog = ({
  isPending,
  linkedFlows,
  connectionName,
  mutationFn,
  children,
}: DeleteConnectionDialogProps) => {
  return (
    <ConfirmationDeleteDialog
      title={
        <span className="text-primary-300 dark:text-primary text-[22px]">
          {t('Delete connection')}
        </span>
      }
      className="max-w-[700px]"
      message={
        <span className="max-w-[652px] block text-primary-300 dark:text-primary text-base font-medium ">
          {t('Are you sure you want to delete "{connectionName}"?', {
            connectionName: (
              <b className="font-bold break-words">{connectionName}</b>
            ),
          })}
        </span>
      }
      content={
        <DeleteConnectionDialogContent
          isPending={isPending}
          linkedFlows={linkedFlows}
        />
      }
      mutationFn={mutationFn}
      entityName={connectionName}
    >
      {children}
    </ConfirmationDeleteDialog>
  );
};

export { DeleteConnectionDialog };
