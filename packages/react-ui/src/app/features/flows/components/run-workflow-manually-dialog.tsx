import { DictionaryProperty } from '@/app/features/builder/block-properties/dictionary-property';
import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  FormMessage,
} from '@openops/components/ui';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { Static, Type } from '@sinclair/typebox';
import { t } from 'i18next';
import React from 'react';
import { useForm } from 'react-hook-form';

type RunWorkflowManuallyDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onRun: (params: Record<string, string>) => void;
  isRunPending: boolean;
  children: React.ReactNode;
};

const RunWorkflowManuallySchema = Type.Object({
  queryParams: Type.Record(
    Type.String({
      minLength: 1,
    }),
    Type.String({
      minLength: 1,
    }),
  ),
});

type RunWorkflowManuallySchema = Static<typeof RunWorkflowManuallySchema>;

const RunWorkflowManuallyDialog = ({
  isOpen,
  setIsOpen,
  onRun,
  isRunPending,
  children,
}: RunWorkflowManuallyDialogProps) => {
  const runWorkflowManuallyForm = useForm<RunWorkflowManuallySchema>({
    resolver: typeboxResolver(RunWorkflowManuallySchema),
    defaultValues: {
      queryParams: { '': '' },
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={'min-w-[630px] flex flex-col'}>
        <DialogHeader>
          <DialogTitle className="text-primary text-[22px] font-bold">
            {t('Manual Webhook Trigger')}
          </DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-primary font-medium">
          {t(
            'To run this workflow manually, please provide the required query parameters.',
          )}
        </p>
        <Form {...runWorkflowManuallyForm}>
          <form className="grid space-y-4">
            <FormField
              control={runWorkflowManuallyForm.control}
              name="queryParams"
              render={({ field }) => (
                <DictionaryProperty
                  values={field.value}
                  onChange={field.onChange}
                ></DictionaryProperty>
              )}
            />
            {runWorkflowManuallyForm?.formState?.errors?.root?.serverError && (
              <FormMessage>
                {
                  runWorkflowManuallyForm.formState.errors.root.serverError
                    .message
                }
              </FormMessage>
            )}
          </form>
        </Form>
        <Button
          type="button"
          loading={isRunPending}
          onClick={() => {
            onRun(runWorkflowManuallyForm.getValues().queryParams);
          }}
          className="w-fit self-end mt-[38px]"
        >
          {t('Run Workflow')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

RunWorkflowManuallyDialog.displayName = 'RunWorkflowManuallyDialog';
export { RunWorkflowManuallyDialog };
