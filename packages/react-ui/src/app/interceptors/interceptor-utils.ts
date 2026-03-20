import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';

export function isForbiddenMutationError(_error: unknown): boolean {
  return false;
}

export function handleMutationError(_error: unknown): void {
  toast(INTERNAL_ERROR_TOAST);
}
