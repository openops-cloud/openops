import { Property } from '@openops/blocks-framework';
import { HGAuth } from '../auth';
import { makePostRequest } from '../callRestApi';

export function getExportTypeProp() {
  return Property.StaticDropdown({
    displayName: 'Export Type',
    description: 'Select PNG or Visio export type',
    required: true,
    options: {
      options: [
        { label: ExportType.PNG, value: ExportType.PNG },
        { label: ExportType.VISIO, value: ExportType.VISIO },
      ],
    },
  });
}

export function getAccountProp() {
  return Property.ShortText({
    displayName: 'Account name',
    required: false,
  });
}

export function getIDProp() {
  return Property.ShortText({
    displayName: 'ID',
    required: false,
  });
}

export function getShowCostProp() {
  return Property.Checkbox({
    displayName: 'Show Cost',
    required: true,
    defaultValue: true,
  });
}

export function getIncludeDependenciesProp() {
  return Property.Checkbox({
    displayName: 'Include dependencies',
    required: true,
    defaultValue: true,
  });
}

type TagType = {
  key: string;
  value: string;
};

export enum ExportType {
  PNG = 'PNG',
  VISIO = 'Visio',
}

type dataType = {
  datasource?: string;
  account?: string;
  id?: string;
  tagViewIds?: string[];
  tags?: TagType[];
  includeDependencies: boolean;
  showCost: boolean;
  exportType: ExportType;
};

export async function exportTopology(auth: HGAuth, data: dataType) {
  const { exportType, ...body } = data;
  const url =
    exportType === ExportType.PNG
      ? auth.instanceUrl + '/hgapi/export-png'
      : auth.instanceUrl + '/hgapi/export-vsdx';
  return await makePostRequest(url, auth.authToken, body);
}
