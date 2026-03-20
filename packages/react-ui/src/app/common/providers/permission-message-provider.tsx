import { PermissionMessageContext } from '@openops/components/ui';
import { t } from 'i18next';
import React from 'react';

import { projectHooks } from '@/app/common/hooks/project-hooks';

export const PermissionMessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { project } = projectHooks.useCurrentProject();

  const value = project?.ownerEmail
    ? t(
        "You don't have permission to perform this action. Please contact a Workspace owner at {email}",
        { email: project.ownerEmail },
      )
    : undefined;

  return (
    <PermissionMessageContext.Provider value={value}>
      {children}
    </PermissionMessageContext.Provider>
  );
};
