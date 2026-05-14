import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../lib/theme';
import { JsonViewer } from '../json-viewer/json-viewer';
import { ToggleSwitch } from '../toggle-switch/toggle-switch';

type TestStepDataViewerProps = {
  inputJson?: any;
  outputJson: any;
  readonly?: boolean;
  onChange?: (json: any) => void;
  theme: Theme;
  editorClassName?: string;
  containerClassName?: string;
};

const JsonViewType = {
  Input: 'Input',
  Output: 'Output',
};

const TestStepDataViewer = ({
  inputJson,
  outputJson,
  readonly,
  onChange,
  theme,
  editorClassName,
  containerClassName,
}: TestStepDataViewerProps) => {
  const { t } = useTranslation();
  const VIEW_INPUT_OPTIONS = [
    {
      value: JsonViewType.Input,
      label: t('Input'),
      tooltipText: t('View input data'),
    },
    {
      value: JsonViewType.Output,
      label: t('Output'),
      tooltipText: t('View output data'),
    },
  ];
  const [selectedViewType, setSelectedViewType] = useState<string>(
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
      className={containerClassName}
    >
      {inputJson ? (
        <ToggleSwitch
          disabled={isEditModeEnabled}
          defaultValue={selectedViewType}
          onChange={setSelectedViewType}
          options={VIEW_INPUT_OPTIONS}
        />
      ) : null}
    </JsonViewer>
  );
};

TestStepDataViewer.displayName = 'TestStepDataViewer';
export { TestStepDataViewer };
