import { t } from 'i18next';
import { useLocation } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { FlagId } from '@openops/shared';

const OpenOpsTablesPage = () => {
  //   const extraData = encodeURIComponent(JSON.stringify({ telemetryEnabled: true }));
  // const iframeSrc = `${openopsTablesUrl}/openops-tables${pathParam}?data=${extraData}`;
  useDefaultSidebarState('minimized');
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

  const iframeSrc = openopsTablesUrl + '/openops-tables' + pathParam;

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
