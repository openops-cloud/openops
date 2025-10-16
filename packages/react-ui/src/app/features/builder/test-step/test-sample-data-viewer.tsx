import { Button, TestStepDataViewer } from '@openops/components/ui';
import { t } from 'i18next';
import React, { useMemo } from 'react';

import { StepStatusIcon } from '@/app/features/flow-runs/components/step-status-icon';
import { formatUtils } from '@/app/lib/utils';
import { StepOutputStatus } from '@openops/shared';

import { useTheme } from '@/app/common/providers/theme-provider';
import { TestButtonTooltip } from './test-step-tooltip';

type TestSampleDataViewerProps = {
  onRetest: () => void;
  isValid: boolean;
  isSaving: boolean;
  isTesting: boolean;
  inputData: unknown;
  outputData: unknown;
  errorMessage: string | undefined;
  lastTestDate: string | undefined;
  readOnly: boolean;
};

const TestSampleDataViewer = React.memo(
  ({
    onRetest,
    isValid,
    isSaving,
    isTesting,
    inputData,
    outputData,
    errorMessage,
    lastTestDate,
    readOnly,
  }: TestSampleDataViewerProps) => {
    const formattedInputData = useMemo(
      () => formatUtils.formatStepInputOrOutput(inputData),
      [inputData],
    );

    const formattedOutputData = useMemo(
      () => formatUtils.formatStepInputOrOutput(outputData),
      [outputData],
    );

    const { theme } = useTheme();

    return (
      <div className="h-full flex flex-col w-full text-start gap-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col flex-grow gap-1">
            <div className="text-md flex gap-1 justyf-center items-center">
              {errorMessage ? (
                <>
                  <StepStatusIcon
                    status={StepOutputStatus.FAILED}
                    size="5"
                  ></StepStatusIcon>
                  <span>{t('Testing Failed')}</span>
                </>
              ) : (
                <>
                  <StepStatusIcon
                    status={StepOutputStatus.SUCCEEDED}
                    size="5"
                  ></StepStatusIcon>
                  <span>{t('Tested Successfully')}</span>
                </>
              )}
            </div>
            <div className="text-muted-foreground text-xs">
              {lastTestDate &&
                !errorMessage &&
                formatUtils.formatDate(new Date(lastTestDate))}
            </div>
          </div>
          <TestButtonTooltip disabled={!isValid}>
            <Button
              variant="outline"
              size="sm"
              disabled={!isValid || isSaving || readOnly}
              keyboardShortcut="G"
              onKeyboardShortcut={readOnly ? undefined : onRetest}
              onClick={onRetest}
              loading={isTesting}
            >
              {t('Retest')}
            </Button>
          </TestButtonTooltip>
        </div>
        <TestStepDataViewer
          outputJson={errorMessage ?? formattedOutputData}
          inputJson={formattedInputData}
          theme={theme}
        />
      </div>
    );
  },
);

TestSampleDataViewer.displayName = 'TestSampleDataViewer';
export { TestSampleDataViewer };
