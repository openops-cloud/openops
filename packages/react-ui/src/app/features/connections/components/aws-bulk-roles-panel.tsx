import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { BlockPropertyMap } from '@openops/blocks-framework';
import { Button, Input, Label, Textarea } from '@openops/components/ui';
import { t } from 'i18next';
import { X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  accountIdFromRoleArn,
  buildRoleArn,
  parseAccountIds,
} from '../lib/aws-bulk-roles-utils';

const ACCOUNT_IDS_INPUT_ID = 'aws-bulk-account-ids';
const ROLE_NAME_INPUT_ID = 'aws-bulk-role-name';
const EXTERNAL_ID_INPUT_ID = 'aws-bulk-external-id';
const ARN_PREVIEW_ACCOUNT_PLACEHOLDER = '<account-id>';

type BulkRoleItem = {
  assumeRoleArn: string;
  assumeRoleExternalId: string | null;
  accountName: string;
};

type WatchedRole =
  { assumeRoleArn?: unknown; accountName?: unknown } | undefined;

export type BulkAddResult = {
  added: number;
  invalid: string[];
  duplicates: string[];
  duplicateAliases: string[];
};

type AwsBulkRolesPanelProps = {
  rolesFieldName: string;
  rolesProperties: BlockPropertyMap;
  roleName: string;
  onRoleNameChange: (roleName: string) => void;
  externalId: string;
  onExternalIdChange: (externalId: string) => void;
  onClose: () => void;
  onAccountsAdded?: (result: BulkAddResult) => void;
};

const AwsBulkRolesPanel = ({
  rolesFieldName,
  rolesProperties,
  roleName,
  onRoleNameChange,
  externalId,
  onExternalIdChange,
  onClose,
  onAccountsAdded,
}: AwsBulkRolesPanelProps) => {
  const form = useFormContext();
  const watchedRoles = useWatch({
    control: form.control,
    name: rolesFieldName,
  }) as WatchedRole[] | undefined;
  const { addArrayItemsToSchema } = useDynamicFormValidationContext();

  const [accountIdsText, setAccountIdsText] = useState('');

  const { existingAccountIds, existingAliases } = useMemo(() => {
    const ids = new Set<string>();
    const aliases = new Set<string>();
    (watchedRoles ?? []).forEach((role) => {
      const accountId = accountIdFromRoleArn(role?.assumeRoleArn);
      if (accountId) {
        ids.add(accountId);
      }
      if (typeof role?.accountName === 'string' && role.accountName.trim()) {
        aliases.add(role.accountName.trim());
      }
    });
    return { existingAccountIds: ids, existingAliases: aliases };
  }, [watchedRoles]);

  const { valid, invalid, duplicates, duplicateAliases } = useMemo(
    () => parseAccountIds(accountIdsText, existingAccountIds, existingAliases),
    [accountIdsText, existingAccountIds, existingAliases],
  );

  const trimmedRoleName = roleName.trim();
  const canAdd = valid.length > 0 && trimmedRoleName.length > 0;

  const handleAdd = useCallback(() => {
    if (!canAdd) {
      return;
    }
    const trimmedExternalId = externalId.trim();
    const items: BulkRoleItem[] = valid.map(({ id, alias }) => ({
      assumeRoleArn: buildRoleArn(id, trimmedRoleName),
      assumeRoleExternalId: trimmedExternalId || null,
      // Alias defaults to the account id, which is what the Accounts dropdown shows.
      accountName: alias || id,
    }));

    const currentRoles =
      (form.getValues(rolesFieldName) as unknown[] | undefined) ?? [];
    form.setValue(rolesFieldName, [...currentRoles, ...items], {
      shouldDirty: true,
      shouldValidate: true,
    });
    // The form schema is a fixed-length tuple; register the new item schemas in one update.
    addArrayItemsToSchema(
      rolesFieldName,
      rolesProperties,
      currentRoles.length,
      items.length,
    );

    setAccountIdsText('');
    onAccountsAdded?.({
      added: items.length,
      invalid,
      duplicates,
      duplicateAliases,
    });
    onClose();
  }, [
    canAdd,
    externalId,
    valid,
    invalid,
    duplicates,
    duplicateAliases,
    trimmedRoleName,
    form,
    addArrayItemsToSchema,
    rolesFieldName,
    rolesProperties,
    onAccountsAdded,
    onClose,
  ]);

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-md border p-4"
      data-testid="awsBulkRolesPanel"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{t('Add multiple accounts')}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onClose}
          data-testid="awsBulkRolesCloseButton"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">{t('Close')}</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ACCOUNT_IDS_INPUT_ID}>{t('Account IDs')}</Label>
        <span className="text-xs text-muted-foreground">
          {t(
            'One account per line: the account ID, optionally followed by an alias (e.g. 123456789012 prod-eu).',
          )}
        </span>
        <Textarea
          id={ACCOUNT_IDS_INPUT_ID}
          value={accountIdsText}
          onChange={(e) => setAccountIdsText(e.target.value)}
          rows={4}
          className="font-mono"
          data-testid="awsBulkAccountIdsInput"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={ROLE_NAME_INPUT_ID}>{t('Role name')}</Label>
          <Input
            id={ROLE_NAME_INPUT_ID}
            value={roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            autoComplete="off"
            data-testid="awsBulkRoleNameInput"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={EXTERNAL_ID_INPUT_ID}>
            {t('External ID (optional)')}
          </Label>
          <Input
            id={EXTERNAL_ID_INPUT_ID}
            value={externalId}
            onChange={(e) => onExternalIdChange(e.target.value)}
            autoComplete="off"
            data-testid="awsBulkExternalIdInput"
          />
        </div>
      </div>

      {trimmedRoleName.length > 0 && (
        <span className="break-all font-mono text-xs text-muted-foreground">
          {buildRoleArn(ARN_PREVIEW_ACCOUNT_PLACEHOLDER, trimmedRoleName)}
        </span>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!canAdd}
          onClick={handleAdd}
          data-testid="awsBulkAddAccountsButton"
        >
          {t('Add {n} account(s)', { n: valid.length })}
        </Button>
      </div>
    </div>
  );
};

AwsBulkRolesPanel.displayName = 'AwsBulkRolesPanel';
export { AwsBulkRolesPanel };
