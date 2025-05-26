import { platformHooks } from '@/app/common/hooks/platform-hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@openops/components/ui';
import { t } from 'i18next';
import { Link } from 'react-router-dom';

const AboutSettingsPage = () => {
  const {
    queryResult: { data, isLoading, error },
    hasNewerVersionAvailable,
  } = platformHooks.useNewerAvailableVersion();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle>{t('About')}</CardTitle>
        <CardDescription>{t('Information about this version')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <span className="text-primary-300 text-base font-medium">
              {t('Running version')}
            </span>
            {isLoading && <LoadingSpinner className="w-4 h-4" />}
            {error && <span>{t('Error loading version')}</span>}
            {data && (
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">
                  {data.currentVersion}
                </span>
                {hasNewerVersionAvailable && (
                  <div className="text-primary-800 text-sm leading-tight bg-muted rounded-xs px-2 py-[3px]">
                    {t('Newer version is available')}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            to="https://docs.openops.com/getting-started/updating-openops"
            target="_blank"
            rel="noopener noreferrer"
            className="self-end"
          >
            <Button disabled={!hasNewerVersionAvailable}>
              {t('Learn how to update')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

AboutSettingsPage.displayName = 'AboutSettingsPage';
export { AboutSettingsPage };
