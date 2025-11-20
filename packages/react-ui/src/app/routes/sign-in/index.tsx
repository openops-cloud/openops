import { AppLogo } from '@/app/common/components/app-logo';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { AuthFormTemplate } from '@/app/features/authentication/components/auth-form-template';
import { FlagId } from '@openops/shared';

const SignInPage: React.FC = () => {
  const { data: isFederatedLogin } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.FEDERATED_LOGIN_ENABLED,
  );

  if (isFederatedLogin) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      <AppLogo />
      <AuthFormTemplate form={'signin'} />
    </div>
  );
};

SignInPage.displayName = 'SignInPage';

export { SignInPage };
