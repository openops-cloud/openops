import { ViewportPortal } from '@xyflow/react';
import React from 'react';

import { useBuilderStateContext } from '../../builder-hooks';

import IncompleteSettingsButton from '@/app/features/builder/flow-canvas/widgets/incomplete-settings-widget';
import { TestFlowWidget } from '@/app/features/builder/flow-canvas/widgets/test-flow-widget';
import { OPS_NODE_SIZE } from '@openops/components/ui';

const AboveFlowWidgets = React.memo(() => {
  const [flowVersion, setRun, selectStepByName, readonly, saving] =
    useBuilderStateContext((state) => [
      state.flowVersion,
      state.setRun,
      state.selectStepByName,
      state.readonly,
      state.saving,
    ]);

  return (
    <ViewportPortal>
      <div
        style={{
          transform: `translate(0px,-${
            OPS_NODE_SIZE.stepNode.height / 2 + 8
          }px )`,
          position: 'absolute',
          pointerEvents: 'auto',
        }}
      >
        <div className="justify-center items-center flex w-[260px]">
          {!readonly && (
            <>
              <TestFlowWidget
                flowVersion={flowVersion}
                setRun={setRun}
                saving={saving}
              ></TestFlowWidget>
              <IncompleteSettingsButton
                flowVersion={flowVersion}
                selectStepByName={selectStepByName}
              ></IncompleteSettingsButton>
            </>
          )}
        </div>
      </div>
    </ViewportPortal>
  );
});
AboveFlowWidgets.displayName = 'AboveFlowWidgets';
export { AboveFlowWidgets };
