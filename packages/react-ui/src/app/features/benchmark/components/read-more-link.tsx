import { t } from 'i18next';

export const ReadMoreLink = () => (
  <button
    type="button"
    onClick={() => {
      // TODO: Link to documentation or info page
      window.open(
        'https://docs.openops.com/benchmark',
        '_blank',
        'noopener noreferrer',
      );
    }}
    className="text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
    aria-label={t('Read more about benchmark documentation')}
  >
    {t('Read more here')} →
  </button>
);
