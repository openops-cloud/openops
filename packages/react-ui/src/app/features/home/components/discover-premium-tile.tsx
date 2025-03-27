import { t } from 'i18next';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

const DiscoverPremiumTile = () => (
  <div className="w-full h-[75px] p-4 flex items-center gap-[18px] bg-blue-100 border rounded-lg">
    <Crown aria-hidden="true" />
    <div className="text-foreground">
      <h2 className="font-bold text-sm">
        {t('Discover our premium features')}
      </h2>
      <p className="font-normal text-sm">
        {t(
          'Explore enterprise features, managed offering, AI Copilot and much more. ',
        )}
        <Link
          to="https://openops.com/pricing"
          target="_blank"
          className="font-bold text-primary-200"
        >
          {t('Learn how')}
        </Link>
      </p>
    </div>
  </div>
);

DiscoverPremiumTile.displayName = 'DiscoverPremiumTile';
export { DiscoverPremiumTile };
