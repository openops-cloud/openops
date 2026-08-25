import {
  ArrayProperty,
  BlockPropertyMap,
  CustomAuthProperty,
} from '@openops/blocks-framework';
import { Button, TextWithIcon } from '@openops/components/ui';
import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AwsBulkRolesPanel, BulkAddResult } from './aws-bulk-roles-panel';

type AwsBulkRolesProps = {
  authProperty: CustomAuthProperty<any>;
  rolesFieldName: string;
};

const formatBulkAddSummary = ({
  added,
  invalid,
  duplicates,
}: BulkAddResult): string => {
  const parts = [t('Added {n} account(s).', { n: added })];
  if (invalid.length > 0) {
    parts.push(
      t('Skipped {n} invalid account ID(s): {ids}.', {
        n: invalid.length,
        ids: invalid.join(', '),
      }),
    );
  }
  if (duplicates.length > 0) {
    parts.push(
      t('Skipped {n} already-listed account(s): {ids}.', {
        n: duplicates.length,
        ids: duplicates.join(', '),
      }),
    );
  }
  return parts.join(' ');
};

/**
 * "+ Add multiple accounts" trigger, panel and post-add summary for the AWS roles
 * array. Rendered inside ArrayBlockProperty's footer slot; the panel and summary
 * take the full row (`basis-full`) so they wrap beneath the buttons.
 */
const AwsBulkRoles = ({ authProperty, rolesFieldName }: AwsBulkRolesProps) => {
  const rolesProperties = (
    authProperty.props?.roles as ArrayProperty<boolean> | undefined
  )?.properties as BlockPropertyMap | undefined;

  const form = useFormContext();
  const roles = useWatch({ control: form.control, name: rolesFieldName });
  const rolesCount = Array.isArray(roles) ? roles.length : 0;

  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [summary, setSummary] = useState<BulkAddResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollToLastRolePending = useRef(false);

  const openPanel = useCallback(() => {
    setSummary(null);
    setOpen(true);
  }, []);
  const closePanel = useCallback(() => setOpen(false), []);
  const handleAccountsAdded = useCallback((result: BulkAddResult) => {
    setSummary(result);
    scrollToLastRolePending.current = true;
  }, []);

  // Bulk-append remounts the role cards, so scroll once the new length has rendered.
  useEffect(() => {
    if (!scrollToLastRolePending.current || rolesCount === 0) {
      return;
    }
    scrollToLastRolePending.current = false;
    const root = containerRef.current?.closest('form') ?? document;
    const lastCard = root.querySelector(
      `[data-testid="arrayPropertiesItem${rolesCount - 1}"]`,
    );
    // scrollIntoView is not implemented in jsdom.
    lastCard?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [rolesCount]);

  if (!rolesProperties) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={openPanel}
        data-testid="awsBulkRolesTrigger"
      >
        <TextWithIcon
          icon={<Plus size={18} />}
          text={t('Add multiple accounts')}
        />
      </Button>
      {open && (
        <div ref={containerRef} className="basis-full">
          <AwsBulkRolesPanel
            rolesFieldName={rolesFieldName}
            rolesProperties={rolesProperties}
            roleName={roleName}
            onRoleNameChange={setRoleName}
            externalId={externalId}
            onExternalIdChange={setExternalId}
            onClose={closePanel}
            onAccountsAdded={handleAccountsAdded}
          />
        </div>
      )}
      {!open && summary && (
        <p
          ref={containerRef}
          className="basis-full text-sm text-muted-foreground"
          data-testid="awsBulkRolesSummary"
        >
          {formatBulkAddSummary(summary)}
        </p>
      )}
    </>
  );
};

AwsBulkRoles.displayName = 'AwsBulkRoles';
export { AwsBulkRoles };
