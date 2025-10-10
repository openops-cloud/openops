import { t } from 'i18next';
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Form, FormControl, FormField, FormItem } from '../../ui/form';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Switch } from '../../ui/switch';
import { BlockIcon } from '../block-icon/block-icon';

export type RunLimitItem = {
  blockName: string;
  actionName: string;
  blockDisplayName?: string;
  actionDisplayName?: string;
  logoUrl?: string;
  isEnabled: boolean;
  limit: number;
};

export type SetRunLimitsValue = {
  enabled: boolean;
  limits: RunLimitItem[];
};

export type SetRunLimitsProps = {
  value: SetRunLimitsValue;
  onSave: (value: SetRunLimitsValue) => void;
  isLoading?: boolean;
  className?: string;
};

export function SetRunLimits({
  value,
  onSave,
  isLoading,
  className,
}: SetRunLimitsProps) {
  const form = useForm<SetRunLimitsValue>({
    defaultValues: {
      enabled: value?.enabled ?? false,
      limits: value?.limits ?? [],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      enabled: value?.enabled ?? false,
      limits: value?.limits ?? [],
    });
  }, [value, form]);

  const enabled = !!form.watch('enabled');
  const limits = form.watch('limits');
  const formValues = form.watch();

  const allChecked = useMemo(
    () =>
      formValues.limits.length > 0 &&
      formValues.limits.every((i) => i?.isEnabled),
    [formValues],
  );
  const someChecked = useMemo(
    () => formValues.limits.some((i) => i?.isEnabled) && !allChecked,
    [formValues, allChecked],
  );

  const toggleSelectAll = (checked: boolean) => {
    const updated = (formValues.limits || []).map((i) => ({
      ...i,
      isEnabled: !!checked,
    }));
    form.setValue('limits', updated, { shouldDirty: true, shouldTouch: true });
  };

  const onSubmit = (data: SetRunLimitsValue) => {
    onSave(data);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3  text-primary-700 dark:text-white',
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <h2 className="text-[22px] font-bold">{t('Set Action Limits')}</h2>
        <p className="font-medium">
          {t(
            'Workflows with loops may trigger the same action repeatedly. To prevent unintended activity during testing, we recommend setting execution limits per action.',
          )}
        </p>
      </div>

      {!!limits?.length && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn({
              'text-muted-foreground dark:text-muted-foreground': !enabled,
            })}
          >
            <FormField
              control={form.control}
              name={'enabled'}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-6">
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <span className="text-sm font-medium">
                      {t('Enable run limits')}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <div className="mt-4">
              <div className="">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-start gap-6">
                    <Checkbox
                      checked={
                        allChecked
                          ? true
                          : someChecked
                          ? 'indeterminate'
                          : false
                      }
                      onCheckedChange={(v) => toggleSelectAll(!!v)}
                      disabled={!enabled || limits.length === 0}
                      aria-label="Select all"
                      className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
                    />

                    <span className="text-sm font-medium">
                      {t('All actions')}
                    </span>
                  </div>

                  <div className="max-h-[274px] overflow-y-hidden flex">
                    <ScrollArea className="w-full ">
                      <div className="grid auto-rows-[36px] grid-cols-[max-content_max-content_max-content_max-content_max-content_max-content] items-center gap-x-6 gap-y-1">
                        {limits.map((item, index) => (
                          <div
                            key={`${item.blockName}__${item.actionName}`}
                            className="contents"
                            aria-disabled={!enabled}
                          >
                            <FormField
                              control={form.control}
                              name={`limits.${index}.isEnabled` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Checkbox
                                      checked={!!field.value}
                                      onCheckedChange={(v) =>
                                        field.onChange(!!v)
                                      }
                                      disabled={!enabled}
                                      aria-label={`Toggle ${item.blockName} ${item.actionName}`}
                                      className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <BlockIcon
                              logoUrl={item.logoUrl}
                              showTooltip={false}
                              size={'sm'}
                              circle={true}
                              border={false}
                              className={cn('p-0', 'opacity-70')}
                            ></BlockIcon>
                            <span className="text-sm font-medium">
                              {item.blockDisplayName ?? item.blockName}
                            </span>

                            <div className="h-[18px] w-4 border-r"></div>

                            <span className="text-sm font-medium">
                              {item.actionDisplayName ?? item.actionName}
                            </span>

                            <FormField
                              control={form.control}
                              name={`limits.${index}.limit` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={
                                        Number.isFinite(field.value as any)
                                          ? field.value
                                          : 0
                                      }
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const parsed = Number(raw);
                                        field.onChange(
                                          Number.isFinite(parsed) && parsed >= 0
                                            ? parsed
                                            : 0,
                                        );
                                      }}
                                      disabled={!enabled}
                                      className="h-8 w-[64px]"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      )}

      {!limits.length && (
        <div className="px-3 py-6 text-sm text-muted-foreground col-span-5">
          {t('No actions available.')}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          size={'lg'}
          loading={!!isLoading}
          disabled={!limits.length}
          onClick={() => onSave(form.getValues())}
        >
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}

export default SetRunLimits;
