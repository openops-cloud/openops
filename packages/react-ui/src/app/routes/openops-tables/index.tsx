import { t } from 'i18next';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { useCandu } from '@/app/features/extensions/candu/use-candu';
import { FlagId, Permission } from '@openops/shared';

const OpenOpsTablesPage = () => {
  useDefaultSidebarState('minimized');
  const { checkAccess } = useAuthorization();
  const { isCanduEnabled, canduClientToken, canduUserId } = useCandu();
  const parentData = encodeURIComponent(
    JSON.stringify({ isCanduEnabled, userId: canduUserId, canduClientToken }),
  );

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const pathParam = params.get('path') || '';

  const title = t('Tables');
  const { data: openopsTablesUrl } = flagsHooks.useFlag<any>(
    FlagId.OPENOPS_TABLES_PUBLIC_URL,
  );

  if (!checkAccess(Permission.WRITE_TABLE)) {
    return <Navigate to="/" replace />;
  }

  if (!openopsTablesUrl) {
    console.error('OpenOps Tables URL is not defined');
    return null;
  }

  const iframeSrc = `${openopsTablesUrl}/openops-tables${pathParam}?parentData=${parentData}`;

  return (
    <div className="flex flex-col size-full">
      <div className="h-full">
        <iframe
          className="w-full h-full"
          src={iframeSrc}
          title={title}
        ></iframe>
      </div>
    </div>
  );
};

export { OpenOpsTablesPage };
