import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Form, FormField, FormItem, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { INTERNAL_ERROR_TOAST, toast } from '../../ui/use-toast';

const RenameSchema = Type.Object({
  displayName: Type.String(),
});

export type RenameSchema = Static<typeof RenameSchema>;

export type RenameDialogProps = {
  children: React.ReactNode;
  currentName: string;
  onSubmit: (newName: string) => Promise<unknown> | unknown;
  dialogTitle?: string;
  nameLabel?: string;
  placeholder?: string;
  confirmLabel?: string;
  onError?: (e: unknown) => void;
};

const RenameDialog: React.FC<RenameDialogProps> = ({
  children,
  currentName,
  onSubmit,
  dialogTitle,
  nameLabel,
  placeholder,
  confirmLabel,
  onError,
}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RenameSchema>({
    resolver: typeboxResolver(RenameSchema),
    defaultValues: { displayName: currentName },
  });

  const handleSubmit = async (data: RenameSchema) => {
    try {
      setSubmitting(true);
      await onSubmit(data.displayName);
      setOpen(false);
    } catch (e) {
      if (onError) onError(e);
      else toast(INTERNAL_ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? 'Rename'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem className="grid space-y-2">
                  <Label htmlFor="displayName">{nameLabel ?? 'Name'}</Label>
                  <Input
                    {...field}
                    id="displayName"
                    placeholder={placeholder ?? 'New name'}
                    className="rounded-sm"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {form?.formState?.errors?.root?.serverError && (
              <FormMessage>
                {form.formState.errors.root.serverError.message}
              </FormMessage>
            )}
            <Button loading={submitting}>{confirmLabel ?? 'Confirm'}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { RenameDialog };
