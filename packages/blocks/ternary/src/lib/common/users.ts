import { HttpMethod } from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import { ternaryAuth } from './auth';
import { sendTernaryRequest } from './index';

export async function getUsersList(
  auth: ternaryAuth,
  includeSettings = false,
): Promise<unknown[]> {
  const response = await sendTernaryRequest({
    auth: auth,
    method: HttpMethod.GET,
    url: 'users',
    queryParams: {
      tenantID: auth.tenantId,
      includeSettings: `${includeSettings}`,
    },
  });

  return response.body;
}

export function getUsersIDsDropdownProperty(
  displayName: string,
  required = false,
) {
  return Property.MultiSelectDropdown({
    displayName,
    description: 'Select one or more users from the list',
    refreshers: ['auth'],
    required: required,
    options: async ({ auth }: any) => {
      try {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const usersList = (await getUsersList(auth as ternaryAuth)) as any as {
          users: { email: string; id: string }[];
        };

        return {
          options: usersList.users.map((value) => ({
            label: value.email,
            value: value.id,
          })),
        };
      } catch (error) {
        return {
          options: [],
          disabled: true,
          placeholder: 'An error occurred while fetching the users list',
          error: String(error),
        };
      }
    },
  });
}
