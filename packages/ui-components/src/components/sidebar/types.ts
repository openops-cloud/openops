import { LucideProps } from 'lucide-react';

export type MenuLink = {
  to: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  target?: React.HTMLAttributeAnchorTarget;
  isComingSoon?: boolean;
  notificationLabel?: string;
};
