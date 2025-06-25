import { useMemo, useState } from 'react';
import { JsonViewer } from '../json-viewer/json-viewer';
import { JsonViewType, ViewToggleButtons } from './view-toggle-buttons';

type TestStepDataViewerProps = {
  inputJson?: any;
  outputJson: any;
  readonly?: boolean;
  onChange?: (json: any) => void;
  theme?: string;
  editorClassName?: string;
};

const TestStepDataViewer = ({
  inputJson,
  outputJson,
  readonly,
  onChange,
  theme,
  editorClassName,
}: TestStepDataViewerProps) => {
  const [selectedViewType, setSelectedViewType] = useState<JsonViewType>(
    JsonViewType.Output,
  );

  const [isEditModeEnabled, setIsEditModeEnabled] = useState<boolean>(false);

  const selectedJson = useMemo(() => {
    return selectedViewType === JsonViewType.Input ? inputJson : outputJson;
  }, [selectedViewType, inputJson, outputJson]);

  return (
    <JsonViewer
      json={selectedJson}
      title={selectedViewType}
      readonly={readonly}
      onChange={onChange}
      theme={theme}
      editorClassName={editorClassName}
      onEditModeChange={setIsEditModeEnabled}
    >
      {inputJson ? (
        <ViewToggleButtons
          disabled={isEditModeEnabled}
          viewType={selectedViewType}
          onViewTypeChange={setSelectedViewType}
        />
      ) : null}
    </JsonViewer>
  );
};

TestStepDataViewer.displayName = 'TestStepDataViewer';
export { TestStepDataViewer };
