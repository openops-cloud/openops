import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@openops/components/ui';
import { Static, Type } from '@sinclair/typebox';
import React from 'react';
import { useFormContext } from 'react-hook-form';

import { BasicAuthProperty } from '@openops/blocks-framework';
import { UpsertBasicAuthRequest } from '@openops/shared';

type BasicAuthConnectionSettingsProps = {
  authProperty: BasicAuthProperty;
};

const BasicAuthConnectionSettings = React.memo(
  ({ authProperty }: BasicAuthConnectionSettingsProps) => {
    const forSchema = Type.Object({
      request: UpsertBasicAuthRequest,
    });
    const form = useFormContext<Static<typeof forSchema>>();

    return (
      <>
        <FormField
          name="request.value.username"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{authProperty.username.displayName}</FormLabel>
              <FormControl>
                <Input {...field} type="text" />
              </FormControl>
              <FormDescription>
                {authProperty.username.description}
              </FormDescription>
            </FormItem>
          )}
        ></FormField>
        <FormField
          name="request.value.password"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{authProperty.password.displayName}</FormLabel>
              <FormControl>
                <Input {...field} type="password" autoComplete="new-password" />
              </FormControl>
              <FormDescription>
                {authProperty.password.description}
              </FormDescription>
            </FormItem>
          )}
        ></FormField>
      </>
    );
  },
);

BasicAuthConnectionSettings.displayName = 'BasicAuthConnectionSettings';
export { BasicAuthConnectionSettings };
