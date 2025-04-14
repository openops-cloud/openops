import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { endFlowAction } from './lib/actions/end-workflow';

export const endFlow = createBlock({
  displayName: 'End Workflow',
  description: 'End the current workflow',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl:
    'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%3C!--%20License%3A%20MIT.%20Made%20by%20phosphor%3A%20https%3A%2F%2Fgithub.com%2Fphosphor-icons%2Fphosphor-icons%20--%3E%3Csvg%20fill%3D%22%23000000%22%20width%3D%22800px%22%20height%3D%22800px%22%20viewBox%3D%220%200%20256%20256%22%20id%3D%22Flat%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M128%2C20.00012a108%2C108%2C0%2C1%2C0%2C108%2C108A108.12217%2C108.12217%2C0%2C0%2C0%2C128%2C20.00012Zm0%2C192a84%2C84%2C0%2C1%2C1%2C84-84A84.0953%2C84.0953%2C0%2C0%2C1%2C128%2C212.00012Zm40.48535-107.51465L144.9707%2C128.00012l23.51465%2C23.51465a12.0001%2C12.0001%2C0%2C0%2C1-16.9707%2C16.9707L128%2C144.97082l-23.51465%2C23.51465a12.0001%2C12.0001%2C0%2C0%2C1-16.9707-16.9707l23.51465-23.51465L87.51465%2C104.48547a12.0001%2C12.0001%2C0%2C0%2C1%2C16.9707-16.9707L128%2C111.02942l23.51465-23.51465a12.0001%2C12.0001%2C0%2C0%2C1%2C16.9707%2C16.9707Z%22%2F%3E%3C%2Fsvg%3E',
  authors: [],
  actions: [endFlowAction],
  triggers: [],
  categories: [BlockCategory.WORKFLOW],
});
