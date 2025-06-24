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

  const selectedJson = useMemo(() => {
    return selectedViewType === JsonViewType.Input ? inputJson : outputJson;
  }, [selectedViewType, inputJson, outputJson]);

  return (
    <div className="bg-background">
      <JsonViewer
        json={selectedJson}
        title={selectedViewType}
        readonly={readonly}
        onChange={onChange}
        theme={theme}
        editorClassName={editorClassName}
      >
        {inputJson ? (
          <ViewToggleButtons
            viewType={selectedViewType}
            onViewTypeChange={setSelectedViewType}
          />
        ) : null}
      </JsonViewer>
    </div>
  );
};

TestStepDataViewer.displayName = 'TestStepDataViewer';
export { TestStepDataViewer };
