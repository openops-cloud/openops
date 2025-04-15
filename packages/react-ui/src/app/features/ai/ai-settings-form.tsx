import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { createDefaultValues } from '@/app/features/connections/lib/connections-utils';
import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Button, INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import { UpsertAppConnectionRequestBody } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const AiSettingsForm = () => {
  const { formSchema, setFormSchema, formSchemaRef } =
    useDynamicFormValidationContext();

  useEffect(() => {
    if (!formSchemaRef.current) {
      const schema = Type.Object({});

      if (schema) {
        formSchemaRef.current = true;
        setFormSchema(schema);
      }
    }
  }, [formSchemaRef, setFormSchema]);

  const form = useForm<{
    request: UpsertAppConnectionRequestBody;
  }>({
    defaultValues: {
      request: createDefaultValues({} as any, 'sda'),
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: typeboxResolver(formSchema),
  });

  useEffect(() => {
    form.trigger();
  }, [form, formSchema]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const formValues = form.getValues();
      return new Promise((resolve) => resolve(formValues));
    },
    onSuccess: () => {},
    onError: (err) => {
      toast(INTERNAL_ERROR_TOAST);
      console.error(err);
    },
  });

  return (
    <>
      <p></p>
      <Button
        onClick={(e) => form.handleSubmit(() => mutate())(e)}
        loading={isPending}
        type="submit"
        size="lg"
        disabled={!form.formState.isValid}
      >
        {t('Save')}
      </Button>
    </>
  );
};

AiSettingsForm.displayName = 'AiSettingsForm';
export { AiSettingsForm };
