import {
  Button,
  FormField,
  FormItem,
  FormMessage,
  Label,
  Switch,
  cn,
} from '@openops/components/ui';
import {
  BranchAction,
  BranchOperator,
  singleValueConditions,
  textConditions,
} from '@openops/shared';
import { t } from 'i18next';
import { Trash } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { SearchableSelect } from '@/app/common/components/searchable-select';

import { TextInputWithMentions } from '../../block-properties/text-input-with-mentions';

export const textToBranchOperation: Record<BranchOperator, string> = {
  [BranchOperator.TEXT_CONTAINS]: t('(Text) Contains'),
  [BranchOperator.TEXT_DOES_NOT_CONTAIN]: t('(Text) Does not contain'),
  [BranchOperator.TEXT_EXACTLY_MATCHES]: t('(Text) Exactly matches'),
  [BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH]: t(
    '(Text) Does not exactly match',
  ),
  [BranchOperator.TEXT_STARTS_WITH]: t('(Text) Starts with'),
  [BranchOperator.TEXT_DOES_NOT_START_WITH]: t('(Text) Does not start with'),
  [BranchOperator.TEXT_ENDS_WITH]: t('(Text) Ends with'),
  [BranchOperator.TEXT_DOES_NOT_END_WITH]: t('(Text) Does not end with'),
  [BranchOperator.NUMBER_IS_GREATER_THAN]: t('(Number) Is greater than'),
  [BranchOperator.NUMBER_IS_LESS_THAN]: t('(Number) Is less than'),
  [BranchOperator.NUMBER_IS_EQUAL_TO]: t('(Number) Is equal to'),
  [BranchOperator.BOOLEAN_IS_TRUE]: t('(Boolean) Is true'),
  [BranchOperator.BOOLEAN_IS_FALSE]: t('(Boolean) Is false'),
  [BranchOperator.EXISTS]: t('Exists'),
  [BranchOperator.DOES_NOT_EXIST]: t('Does not exist'),
  [BranchOperator.LIST_IS_EMPTY]: t('(List) Is empty'),
  [BranchOperator.LIST_IS_NOT_EMPTY]: t('(List) Is not empty'),
  [BranchOperator.LIST_COUNT_IS_GREATER_THAN]: t(
    '(List length) Is greater than',
  ),
  [BranchOperator.LIST_COUNT_IS_LESS_THAN]: t('(List length) Is less than'),
  [BranchOperator.LIST_COUNT_IS_EQUAL_TO]: t('(List length) Is equal to'),
  [BranchOperator.LIST_CONTAINS]: t('(List) Contains'),
  [BranchOperator.LIST_NOT_CONTAINS]: t('(List) Not Contains'),
  [BranchOperator.DATE_IS_BEFORE]: t('(Date) Is before'),
  [BranchOperator.DATE_IS_AFTER]: t('(Date) Is after'),
};

const operationOptions = Object.keys(textToBranchOperation).map((operator) => {
  return {
    label: textToBranchOperation[operator as BranchOperator],
    value: operator,
  };
});

type BranchSingleConditionProps = {
  showDelete: boolean;
  groupIndex: number;
  conditionIndex: number;
  readonly: boolean;
  deleteClick: () => void;
};

const BranchSingleCondition = ({
  deleteClick,
  groupIndex,
  conditionIndex,
  showDelete,
  readonly,
}: BranchSingleConditionProps) => {
  const form = useFormContext<BranchAction>();

  const condition =
    form.getValues().settings.conditions[groupIndex][conditionIndex];
  const isTextCondition =
    condition.operator && textConditions.includes(condition?.operator);
  const isSingleValueCondition =
    condition.operator && singleValueConditions.includes(condition?.operator);
  return (
    <>
      <div
        className={cn('grid gap-2', {
          'grid-cols-2': isSingleValueCondition,
          'grid-cols-3': !isSingleValueCondition,
        })}
      >
        <FormField
          name={`settings.conditions.${groupIndex}.${conditionIndex}.firstValue`}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <TextInputWithMentions
                disabled={readonly}
                placeholder={t('First value')}
                onChange={field.onChange}
                initialValue={field.value}
              ></TextInputWithMentions>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name={`settings.conditions.${groupIndex}.${conditionIndex}.operator`}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <SearchableSelect
                disabled={readonly}
                value={field.value}
                options={operationOptions}
                placeholder={''}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {!isSingleValueCondition && (
          <FormField
            name={`settings.conditions.${groupIndex}.${conditionIndex}.secondValue`}
            control={form.control}
            defaultValue={
              form.getValues(
                `settings.conditions.${groupIndex}.${conditionIndex}.secondValue`,
              ) ?? ''
            }
            render={({ field }) => (
              <FormItem>
                <TextInputWithMentions
                  placeholder={t('Second value')}
                  disabled={readonly}
                  initialValue={field.value ?? ''}
                  onChange={field.onChange}
                ></TextInputWithMentions>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="flex justify-start items-center gap-2 mt-2">
        {isTextCondition && (
          <FormField
            name={`settings.conditions.${groupIndex}.${conditionIndex}.caseSensitive`}
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 p-1">
                  <Switch
                    disabled={readonly}
                    id="case-sensitive"
                    checked={field.value}
                    onCheckedChange={(e) => field.onChange(e)}
                  />
                  <Label htmlFor="case-sensitive">{t('Case sensitive')}</Label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex-grow"></div>
        <div>
          {showDelete && (
            <Button variant={'basic'} size={'sm'} onClick={deleteClick}>
              <Trash className="w-4 h-4"></Trash> {t('Remove')}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

BranchSingleCondition.displayName = 'BranchSingleCondition';
export { BranchSingleCondition };
