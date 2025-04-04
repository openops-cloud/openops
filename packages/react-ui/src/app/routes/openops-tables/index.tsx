import { t } from 'i18next';
import { useLocation } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { useCandu } from '@/app/features/extensions/candu/use-candu';
import { FlagId } from '@openops/shared';

const OpenOpsTablesPage = () => {
  useDefaultSidebarState('minimized');
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
