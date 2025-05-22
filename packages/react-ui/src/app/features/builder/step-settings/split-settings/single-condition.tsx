import { cn, FormField, FormItem, FormMessage } from '@openops/components/ui';
import { t } from 'i18next';
import { useFormContext } from 'react-hook-form';

import { SearchableSelect } from '@/app/common/components/searchable-select';
import {
  BranchOperator,
  singleValueConditions,
  SplitAction,
} from '@openops/shared';

import { TextInputWithMentions } from '../../block-properties/text-input-with-mentions';
import { textToBranchOperation } from '../branch-settings/branch-single-condition';

const operationOptions = Object.keys(textToBranchOperation).map((operator) => {
  return {
    label: textToBranchOperation[operator as BranchOperator],
    value: operator,
  };
});

type SingleConditionProps = {
  groupIndex: number;
  groupName: `settings.options.${number}.conditions`;
  conditionIndex: number;
  readonly: boolean;
};

const SingleCondition = ({
  groupIndex,
  groupName,
  conditionIndex,
  readonly,
}: SingleConditionProps) => {
  const form = useFormContext<SplitAction>();
  const conditions = form.watch(`${groupName}.${conditionIndex}`);

  if (!conditions) {
    return null;
  }

  const isSingleValueCondition =
    conditions[groupIndex]?.operator &&
    singleValueConditions.includes(
      conditions[groupIndex]?.operator as BranchOperator,
    );

  return (
    <div className="p-2 pb-6 rounded-md bg-gray-100 dark:bg-slate-900">
      <p className="text-gray-600 text-sm dark:text-white mb-1">{t('Where')}</p>
      <div
        className={cn('grid gap-2', {
          'grid-cols-2': isSingleValueCondition,
          'grid-cols-3': !isSingleValueCondition,
        })}
      >
        <FormField
          name={`${groupName}.${conditionIndex}.${0}.firstValue`}
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
          name={`${groupName}.${conditionIndex}.${0}.operator`}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <SearchableSelect
                disabled={readonly}
                value={field.value}
                options={operationOptions}
                placeholder={''}
                onChange={(e) => field.onChange(e)}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {!isSingleValueCondition && (
          <FormField
            name={`${groupName}.${conditionIndex}.${0}.secondValue`}
            control={form.control}
            defaultValue={
              form.getValues(
                `${groupName}.${conditionIndex}.${0}.secondValue`,
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
    </div>
  );
};

SingleCondition.displayName = 'SingleCondition';
export { SingleCondition };
