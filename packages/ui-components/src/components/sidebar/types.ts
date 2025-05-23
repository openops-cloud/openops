import { LucideProps } from 'lucide-react';

export type MenuLink = {
  to: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  isComingSoon?: boolean;
  notificationLabel?: string;
};
