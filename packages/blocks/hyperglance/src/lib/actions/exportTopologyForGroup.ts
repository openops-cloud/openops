import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import { getDatasourceProp } from '../hgapi/common';
import {
  exportTopology,
  getAccountProp,
  getExportTypeProp,
  getIDProp,
  getIncludeDependenciesProp,
  getShowCostProp,
} from '../hgapi/topology';

export const exportTopologyForGroup = createAction({
  auth: hyperglanceAuth,
  name: 'exportTopologyForGroup',
  displayName: 'Export Diagram',
  description: 'Export a diagram group to PNG or Visio (VSDX)',
  props: {
    datasource: getDatasourceProp(),
    account: getAccountProp(),
    id: getIDProp(),
    includeDependencies: getIncludeDependenciesProp(),
    showCost: getShowCostProp(),
    exportType: getExportTypeProp(),
  },
  isWriteAction: false,
  async run(context) {
    const { auth, propsValue } = context;

    return await exportTopology(auth, propsValue);
  },
});
