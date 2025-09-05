import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { DropdownMenuItem } from '@openops/components/ui';
import type { Flow } from '@openops/shared';
import { t } from 'i18next';
import { Pencil } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

type EditFlowMenuItemProps = {
  flow: Pick<Flow, 'id' | 'folderId'>;
  baseRoute?: string;
  text?: string;
};

export const EditFlowMenuItem: React.FC<EditFlowMenuItemProps> = ({
  flow,
  baseRoute = '/flows',
  text = 'Edit',
}) => {
  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <Link
        type="button"
        to={{
          pathname: `${baseRoute}/${flow.id}`,
          search: `?folderId=${flow.folderId}&${SEARCH_PARAMS.viewOnly}=false`,
        }}
      >
        <div className="flex cursor-pointer flex-row gap-2 items-center">
          <Pencil className="h-4 w-4" />
          <span>{t(text)}</span>
        </div>
      </Link>
    </DropdownMenuItem>
  );
};
