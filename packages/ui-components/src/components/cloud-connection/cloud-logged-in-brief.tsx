import { t } from 'i18next';
import { User } from 'lucide-react';
import { ReactNode } from 'react';
import { Alert, AlertDescription } from '../../ui/alert';

export const CloudLoggedInBrief = ({ appLogo }: { appLogo: ReactNode }) => (
  <div className="flex flex-col items-center h-[100vh] p-5 gap-4">
    {appLogo}
    <div className="w-[42px] h-[42px] mt-[100px] bg-gray-300 rounded-full flex items-center justify-center">
      <User />
    </div>
    <h1 className="text-base text-center">
      {t('You are now logged in,')}
      <br />
      {t('you can close this window anytime.')}
    </h1>
    <Alert className="mt-8 text-sm flex-col max-w-[560px]" variant="default">
      <AlertDescription>
        <b>{t('Note: ')}</b>
        {t(
          "Exploring template catalog might not work if you're not running Openops over a secure HTTPS connection.",
        )}
      </AlertDescription>
    </Alert>
  </div>
);
