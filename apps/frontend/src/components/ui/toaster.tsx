'use client';

import { CheckCircle2, Info, XCircle } from 'lucide-react';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const Icon =
          variant === 'destructive'
            ? XCircle
            : variant === 'success'
              ? CheckCircle2
              : Info;

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-2.5">
              <Icon
                className={
                  variant === 'destructive'
                    ? 'mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground'
                    : 'mt-0.5 h-4 w-4 shrink-0 text-success'
                }
              />
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
