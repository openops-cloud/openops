'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToast } from './use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        closeButtonClassName,
        ...props
      }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1" data-testid="toast">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className={closeButtonClassName} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
