import { ConnectionSelect } from '@/app/features/builder/step-settings/block-settings/connection-select';
import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import { Form } from '@openops/components/ui';
import equal from 'fast-deep-equal';
import debounce from 'lodash.debounce';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

type AiSettingsFormProps = {
  block: BlockMetadataModelSummary | BlockMetadataModel;
  providerKey: string;
  initialConnection?: string;
  onSave: (connectionName: string) => void;
  displayName?: string;
  disabled?: boolean;
  labelPlacement?: 'top' | 'left';
};

type LocalForm = { connection: string };

export const EMPTY_FORM_VALUE: LocalForm = {
  connection: '',
};

const AiSettingsForm = ({
  block,
  providerKey,
  initialConnection,
  onSave,
  displayName,
  labelPlacement,
  disabled = false,
}: AiSettingsFormProps) => {
  const form = useForm<LocalForm>({
    defaultValues: EMPTY_FORM_VALUE,
    mode: 'onChange',
  });
  const [initialFormValue, setInitialFormValue] =
    useState<LocalForm>(EMPTY_FORM_VALUE);

  useEffect(() => {
    const formValue: LocalForm = {
      connection: initialConnection ?? '',
    };
    setInitialFormValue(formValue);
    form.reset(formValue);
  }, [initialConnection, form]);

  const currentFormValue = form.watch();
  const watchedConnection = form.watch('connection');

  const isFormUnchanged = useMemo(() => {
    return equal(currentFormValue, initialFormValue);
  }, [currentFormValue, initialFormValue]);

  const debouncedSave = useMemo(
    () =>
      debounce((connection: string, unchanged: boolean) => {
        if (!unchanged) {
          onSave(connection);
          setInitialFormValue({ connection });
        }
      }, 300),
    [onSave],
  );

  useEffect(() => {
    debouncedSave(watchedConnection ?? '', isFormUnchanged);
  }, [debouncedSave, watchedConnection, isFormUnchanged]);

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return (
    <Form {...form}>
      <form>
        <ConnectionSelect
          disabled={disabled}
          allowDynamicValues={false}
          block={block}
          providerKey={providerKey}
          name={'connection'}
          displayName={displayName}
          labelPlacement={labelPlacement}
        />
      </form>
    </Form>
  );
};

AiSettingsForm.displayName = 'AiSettingsForm';
export { AiSettingsForm };
