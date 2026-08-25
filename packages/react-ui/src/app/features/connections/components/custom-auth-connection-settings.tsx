import React from 'react';

import { AutoPropertiesFormComponent } from '@/app/features/builder/block-properties/auto-properties-form';
import { CustomAuthProperty } from '@openops/blocks-framework';

type CustomAuthConnectionSettingsProps = {
  authProperty: CustomAuthProperty<any>;
  /** Extra footer actions for ARRAY auth properties, keyed by property name. */
  arrayExtraActions?: Record<string, React.ReactNode>;
};

const CustomAuthConnectionSettings = React.memo(
  ({ authProperty, arrayExtraActions }: CustomAuthConnectionSettingsProps) => {
    return (
      <AutoPropertiesFormComponent
        prefixValue="request.value.props"
        props={authProperty.props}
        useMentionTextInput={false}
        allowDynamicValues={false}
        arrayExtraActions={arrayExtraActions}
      />
    );
  },
);

CustomAuthConnectionSettings.displayName = 'CustomAuthConnectionSettings';
export { CustomAuthConnectionSettings };
