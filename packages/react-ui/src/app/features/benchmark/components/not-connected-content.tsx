import { t } from 'i18next';

interface NotConnectedContentProps {
  name: string;
  onConnect: () => void;
}

export const NotConnectedContent = ({
  name,
  onConnect,
}: NotConnectedContentProps) => (
  <>
    <div className="flex items-center gap-2">
      <span>{name}</span>
      <span className="font-light hidden @[280px]:inline">
        {t('(Not connected)')}
      </span>
    </div>
    <div className="flex-1" />
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onConnect();
      }}
      className="text-primary-200 text-sm"
    >
      {t('Connect')}
    </button>
  </>
);
