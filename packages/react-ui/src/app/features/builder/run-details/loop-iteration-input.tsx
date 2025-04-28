import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
} from '@openops/components/ui';
import { useCallback, useMemo, useRef, useState } from 'react';

import { ActionType } from '@openops/shared';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { flowRunUtils } from '../../flow-runs/lib/flow-run-utils';
import { useBuilderStateContext } from '../builder-hooks';

const LoopIterationInput = ({
  stepName,
  isStepSelected,
}: {
  stepName: string;
  isStepSelected: boolean;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [
    setLoopIndex,
    currentIndex,
    run,
    flowVersion,
    loopsIndexes,
    selectStepByName,
  ] = useBuilderStateContext((state) => [
    state.setLoopIndex,
    state.loopsIndexes[stepName] ?? 0,
    state.run,
    state.flowVersion,
    state.loopsIndexes,
    state.selectStepByName,
  ]);

  const inputRef = useRef<HTMLInputElement>(null);

  const stepOutput = useMemo(() => {
    return run && run.steps
      ? flowRunUtils.extractStepOutput(
          stepName,
          loopsIndexes,
          run.steps,
          flowVersion.trigger,
        )
      : null;
  }, [run, stepName, loopsIndexes, flowVersion.trigger]);

  const totalIterations = useMemo(() => {
    return stepOutput?.output && stepOutput.type === ActionType.LOOP_ON_ITEMS
      ? stepOutput.output.iterations.length
      : 0;
  }, [stepOutput]);

  useMemo(() => {
    if (
      totalIterations <= currentIndex ||
      currentIndex === Number.MAX_SAFE_INTEGER
    ) {
      setLoopIndex(stepName, totalIterations - 1);
    }
  }, [totalIterations, currentIndex, setLoopIndex, stepName]);

  const iterationOptions = useMemo(() => {
    return Array.from({ length: totalIterations }, (_, i) => i + 1);
  }, [totalIterations]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? '1';
      const parsedValue = Math.max(
        1,
        Math.min(parseInt(value) ?? 1, totalIterations),
      );
      setLoopIndex(stepName, parsedValue - 1);
    },
    [setLoopIndex, stepName, totalIterations],
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value === '' && inputRef.current) {
        inputRef.current.value = '1';
        setLoopIndex(stepName, 0);
      }
    },
    [setLoopIndex, stepName],
  );

  const handleSelectIteration = useCallback(
    (iteration: number) => {
      if (inputRef.current) {
        inputRef.current.value = String(iteration);
      }
      setLoopIndex(stepName, iteration - 1);
      setIsDropdownOpen(false);
    },
    [setLoopIndex, stepName],
  );

  const onInputClick = useCallback(() => {
    if (!isStepSelected) {
      selectStepByName(stepName);
    }
    setIsDropdownOpen(true);
  }, [isStepSelected, selectStepByName, stepName]);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowRight' && currentIndex < totalIterations - 1) {
        setLoopIndex(stepName, currentIndex + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setLoopIndex(stepName, currentIndex - 1);
      }
    },
    [currentIndex, setLoopIndex, stepName, totalIterations],
  );

  const onArrowClick = useCallback(
    (newIndex: number) => {
      setLoopIndex(stepName, newIndex);
      if (inputRef.current) {
        inputRef.current.value = String(newIndex + 1);
      }
    },
    [setLoopIndex, stepName],
  );

  const inputWidth =
    (inputRef.current?.value.length ?? 1) +
    2 +
    String(totalIterations).length +
    'ch';

  return (
    <div
      className="w-fit flex items-center gap-1"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {isStepSelected && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="p-0"
            disabled={currentIndex === 0}
            onClick={() => onArrowClick(0)}
          >
            <ChevronsLeft size={16} />
          </Button>

          <Button
            variant="ghost"
            className="p-0"
            disabled={currentIndex === 0}
            onClick={() => onArrowClick(currentIndex - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
        </div>
      )}

      <div
        className="relative"
        tabIndex={-1}
        onKeyDown={onInputKeyDown}
        aria-hidden="true"
      >
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center cursor-pointer">
              <Input
                ref={inputRef}
                className="h-7 flex-grow-0 text-start rounded-sm p-1 pr-6"
                style={{
                  width: inputWidth,
                }}
                value={currentIndex + 1}
                type="number"
                min={1}
                max={totalIterations}
                onChange={onChange}
                onBlur={onBlur}
                onClick={onInputClick}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            style={{
              minWidth: inputWidth,
              width: inputWidth,
            }}
          >
            <ScrollArea className="h-full" viewPortClassName="max-h-[95px]">
              {iterationOptions.map((iteration) => (
                <DropdownMenuItem
                  key={iteration}
                  className={cn('cursor-pointer flex justify-center mr-1', {
                    'bg-accent': iteration === currentIndex + 1,
                  })}
                  onClick={() => handleSelectIteration(iteration)}
                >
                  {iteration}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className={cn(
            'absolute top-1 right-2 pointer-events-none h-full text-sm text-muted-foreground',
          )}
        >
          <div className="pointer-events-none">/ {totalIterations}</div>
        </div>
      </div>

      {isStepSelected && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="p-0"
            disabled={currentIndex === totalIterations - 1}
            onClick={() => onArrowClick(currentIndex + 1)}
          >
            <ChevronRight size={16} />
          </Button>

          <Button
            variant="ghost"
            className="p-0"
            disabled={currentIndex === totalIterations - 1}
            onClick={() => onArrowClick(totalIterations - 1)}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

LoopIterationInput.displayName = 'LoopIterationInput';
export { LoopIterationInput };
