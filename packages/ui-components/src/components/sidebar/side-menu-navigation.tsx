import { MenuNavigationItem } from './menu-navigation-item';
import { MenuLink } from './types';

type SideMenuNavigationProps = {
  links: MenuLink[];
  isMinimized: boolean;
  NavTop?: React.ReactNode;
  NavBottom?: React.ReactNode;
};

const SideMenuNavigation = ({
  links,
  isMinimized,
  NavTop,
  NavBottom,
}: SideMenuNavigationProps) => {
  return (
    <nav className="flex flex-col w-full gap-1 py-3 px-3">
      {NavTop}
      {links.map((link, index) => (
        <MenuNavigationItem
          to={link.to}
          target={link.target}
          label={link.label}
          Icon={link.icon}
          key={index}
          isMinimized={isMinimized}
          isComingSoon={link.isComingSoon}
        />
      ))}
      {NavBottom}
    </nav>
  );
};

SideMenuNavigation.displayName = 'SideMenuNavigation';
export { SideMenuNavigation };
