import { HGAuth } from "../auth";
import { makeDeleteRequest, makeGetRequest, makePostRequest } from "../callRestApi";
import { Property } from '@openops/blocks-framework';

export function getAliasDropdownProp() {
    return (
        Property.Dropdown({
            displayName: 'Account name',
            required: true,
            refreshers:  ['auth', 'datasource'],
            options: async ({ auth, datasource }) => {
                if (!auth || !datasource) {
                    return {
                        options: [],
                    };
                }
                const hgAuth = auth as HGAuth;
                const data = await listRecords(hgAuth, datasource as string); 
                return {
                    options: data.map((d) => ({
                        label: d['accountAlias'],
                        value: d['accountAlias'],
                    }))
                }
            },
        })
    );
}

export function getAliasPlainTextProp() {
    return Property.ShortText({
        displayName: 'Account name',
        required: true
    })
}

export function getAccountGroupsProp() {
    return (Property.Array({
      displayName: 'Account Groups',
      description: 'Array of account groups',
      required: false,
    }));
}

export async function listRecords(auth : HGAuth, datasource:string) : Promise<Record<string, any>[]>{
    const url = auth.instanceUrl+"/hgapi/integrations/"+datasource;
    return await makeGetRequest(url, auth.authToken);
}

export async function getRecordStatus(auth : HGAuth, datasource:string, alias:string) {
    const url = auth.instanceUrl+"/hgapi/integrations/"+datasource+"/"+alias+"/status";
    return await makeGetRequest(url, auth.authToken);
}

export async function getRecordStatistics(auth : HGAuth, datasource:string, alias:string) {
    const url = auth.instanceUrl+"/hgapi/integrations/"+datasource+"/"+alias+"/statistics";
    return await makeGetRequest(url, auth.authToken);
}

export async function deleteRecord(auth : HGAuth, datasource:string, alias:string) {
    const url = auth.instanceUrl+"/hgapi/integrations/"+datasource+"/"+alias;
    return await makeDeleteRequest(url, auth.authToken);
}

export async function addRecord(auth : HGAuth, datasource:string, body : Record<string, any>) {
    const url = auth.instanceUrl+"/hgapi/integrations/"+datasource;
    return await makePostRequest(url, auth.authToken, body);
}