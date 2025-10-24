import { TestRunLimitSettings } from '@openops/shared';
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

/**
 * BlockActionLimitMetadata
 *
 * A consolidated metadata map used by TestRunLimitsForm to render human‑friendly
 * block (integration) information and per‑action display names.
 *
 * Structure:
 * {
 *   [blockName: string]: {
 *     displayName: string; // Human‑readable block name (e.g., "Slack")
 *     logoUrl: string;     // Public URL to the block logo image
 *     actions: {
 *       [actionName: string]: string; // Human‑readable action label (e.g., "Send Message")
 *     };
 *   };
 * }
 *
 * Notes:
 * - The top‑level keys are block internal names (e.g., "slack", "aws").
 * - The actions map keys are action internal names (e.g., "send_message").
 * - Values should be display‑ready (localized if your app supports i18n).
 * - This replaces the older trio of props: blockDisplayNames, actionDisplayNames, blockLogoUrls.
 *
 * Example:
 * const meta: BlockActionLimitMetadata = {
 *   slack: {
 *     displayName: 'Slack',
 *     logoUrl: 'https://static.openops.com/blocks/slack.png',
 *     actions: {
 *       send_message: 'Send Message',
 *     },
 *   },
 * };
 */
type BlockActionLimitMetadata = Record<
  string,
  {
    displayName: string;
    logoUrl: string;
    displayIcon: string;
    actions: Record<string, string>;
  }
>;

/**
 * Props for the TestRunLimitsForm component.
 *
 * This component renders a form to configure per-action execution limits
 * for a test run. It supports enabling/disabling limits globally and
 * fine‑tuning individual block/action limits.
 */
type TestRunLimitsFormProps = {
  /**
   * Current settings to display in the form.
   * - isEnabled: whether the run limits feature is enabled globally for the test run
   * - limits: list of per action limits with shape { blockName, actionName, isEnabled, limit }
   */
  value?: TestRunLimitSettings;
  /**
   * Callback fired when the user submits the form.
   * Receives the full TestRunLimitSettings value as the argument.
   */
  onSave: (value: TestRunLimitSettings) => void;
  /**
   * Consolidated metadata per block including display name, logo and action display names.
   * Keys are block names; actions map keys are action names.
   */
  blockActionMetaMap: BlockActionLimitMetadata;
  /**
   * When true, shows a loading skeleton/disabled state for the form to indicate data is being fetched or saved.
   */
  isLoading?: boolean;
  /**
   * Optional className to customize the outer container styling.
   */
  className?: string;
  /**
   * Minimum allowed value for action limits.
   */
  min?: number;
  /**
   * Maximum allowed value for action limits.
   */
  max?: number;
};

function TestRunLimitsForm({
  value,
  onSave,
  blockActionMetaMap,
  isLoading,
  className,
  min = 1,
  max = 99,
}: TestRunLimitsFormProps) {
  const form = useForm<TestRunLimitSettings>({
    defaultValues: {
      isEnabled: value?.isEnabled ?? false,
      limits: value?.limits ?? [],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      isEnabled: value?.isEnabled ?? false,
      limits: value?.limits ?? [],
    });
  }, [value, form]);

  const isEnabled = !!form.watch('isEnabled');
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

  const selectAllChecked: boolean | 'indeterminate' = useMemo(() => {
    if (allChecked) {
      return true;
    }

    return someChecked ? 'indeterminate' : false;
  }, [allChecked, someChecked]);

  const toggleSelectAll = (checked: boolean) => {
    const updated = (formValues.limits || []).map((i) => ({
      ...i,
      isEnabled: !!checked,
    }));
    form.setValue('limits', updated, { shouldDirty: true, shouldTouch: true });
  };

  const onSubmit = (data: TestRunLimitSettings) => {
    onSave(data);
  };

  const hasAvailableActions = !!limits?.length;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 text-primary-700 dark:text-white',
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <h2 className="text-[22px] font-bold">
          {hasAvailableActions
            ? t('Set Action Limits')
            : t('No Actions to Limit')}
        </h2>
        <p className="font-medium">
          {hasAvailableActions
            ? t(
                'Workflows with loops may trigger the same action repeatedly. To prevent unintended activity during testing, we recommend setting execution limits per action.',
              )
            : t(
                'This workflow doesn’t include any actions that require execution limits. If loops or repeated steps are added later, you’ll be able to set limits here to prevent unintended behavior during testing.',
              )}
        </p>
      </div>

      {hasAvailableActions && (
        <>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={cn({
                'text-muted-foreground dark:text-muted-foreground': !isEnabled,
              })}
            >
              <FormField
                control={form.control}
                name={'isEnabled'}
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
                        checked={selectAllChecked}
                        onCheckedChange={(v) => toggleSelectAll(!!v)}
                        disabled={!isEnabled || limits.length === 0}
                        aria-label={t('Select all')}
                        className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
                      />

                      <span className="text-sm font-medium">
                        {t('All actions')}
                      </span>
                    </div>

                    <div className="max-h-[274px] overflow-y-hidden flex">
                      <ScrollArea className="w-full">
                        <div className="grid auto-rows-[36px] grid-cols-[max-content_max-content_max-content_max-content_max-content_max-content] items-center gap-x-6 gap-y-1">
                          {limits.map((item, index) => (
                            <div
                              key={`${item.blockName}__${item.actionName}`}
                              className="contents"
                              aria-disabled={!isEnabled}
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
                                        disabled={!isEnabled}
                                        aria-label={t(
                                          'Toggle {{block}} {{action}}',
                                          {
                                            block: item.blockName,
                                            action: item.actionName,
                                          },
                                        )}
                                        className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <BlockIcon
                                logoUrl={
                                  blockActionMetaMap[item.blockName]?.logoUrl
                                }
                                displayIcon={
                                  blockActionMetaMap[item.blockName]
                                    ?.displayIcon
                                }
                                showTooltip={false}
                                size={'sm'}
                                circle={true}
                                border={false}
                                className={cn('p-0', {
                                  'opacity-70': !isEnabled,
                                })}
                              ></BlockIcon>
                              <span className="text-sm font-medium">
                                {
                                  blockActionMetaMap[item.blockName]
                                    ?.displayName
                                }
                              </span>

                              <div className="h-[18px] w-4 border-r"></div>

                              <span className="text-sm font-medium">
                                {
                                  blockActionMetaMap[item.blockName]?.actions?.[
                                    item.actionName
                                  ]
                                }
                              </span>

                              <FormField
                                control={form.control}
                                name={`limits.${index}.limit` as const}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={min}
                                        max={max}
                                        value={
                                          Number.isFinite(field.value)
                                            ? field.value
                                            : min
                                        }
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const parsed = Number(raw);
                                          field.onChange(
                                            Number.isFinite(parsed) &&
                                              parsed >= min
                                              ? Math.min(parsed, max)
                                              : min,
                                          );
                                        }}
                                        disabled={!isEnabled}
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
        </>
      )}
    </div>
  );
}

export { BlockActionLimitMetadata, TestRunLimitsForm, TestRunLimitsFormProps };
