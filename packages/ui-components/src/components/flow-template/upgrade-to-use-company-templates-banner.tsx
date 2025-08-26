import { t } from 'i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/button';

type UpgradeToUseCompanyTemplatesBannerProps = {
  link: string;
};

const UpgradeToUseCompanyTemplatesBanner = ({
  link,
}: UpgradeToUseCompanyTemplatesBannerProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center text-black dark:text-white">
      <div className="flex flex-col items-center justify-center max-w-[678px]">
        <h2 className="text-[24px] font-bold">
          {t('Upgrade to Enable Custom Templates')}
        </h2>
        <p className="text-base font-normal text-center">
          {t(
            'Streamline your workflows by building and sharing custom best practices across your organization.',
          )}
        </p>
      </div>
      <Link to={link} target="_blank" rel="noopener noreferrer">
        <Button variant="default">{t('Schedule a call to upgrade')}</Button>
      </Link>
    </div>
  );
};

UpgradeToUseCompanyTemplatesBanner.displayName =
  'UpgradeToUseCompanyTemplatesBanner';
export { UpgradeToUseCompanyTemplatesBanner };
