import { Property } from '@openops/blocks-framework';
import { HGAuth } from "../auth";
import { makeGetRequest } from "../callRestApi";

type PropType = {required?:boolean, description?:string};

export function getResourceTypeProp (prop?: PropType) {
    return Property.Dropdown({
        displayName: 'Resource Type',
        description: prop?.description?? 'Fetch data in regards to this type of resource',
        required: prop?.required ?? false,
        refreshers:  ['auth', 'datasource'],
        options: async ({ auth, datasource }) => {
            if (!auth) {
                return {
                    options: [],
                };
            }

            const hgAuth = auth as HGAuth;
            type dataType = {
                datasource: string;
                entityTypes: string[];
            };
            const data: dataType[] = await makeGetRequest(hgAuth.instanceUrl+"/hgapi/entity-types", hgAuth.authToken);
            const types = data.find((d) => d.datasource === datasource)?.entityTypes ?? [];
            return {
                options: types.map((t) => ({
                    label: t,
                    value: t,
                }))
            }
        },
    })
}

export function getDatasourceProp (prop?: PropType) {
    return (
      Property.StaticDropdown({
        displayName: 'Cloud Provider',
        description: prop?.description?? 'Fetch data in regards to this cloud provider',
        required: prop?.required ?? true,
        options: {
          options: [
            { label: 'AWS', value: 'Amazon' },
            { label: 'Azure', value: 'Azure' },
            { label: 'GCP', value: 'GCP' },
            { label: 'Kubernetes', value: 'Kubernetes' }
          ],
        },
      })
    );
}