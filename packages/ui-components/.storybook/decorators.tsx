import isChromatic from 'chromatic/isChromatic';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/global.css';
import '../src/tailwind.css';
import { ThemeSwitcherValue } from './preview';

export const ThemeSwitcherDecorator = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: any;
}) => {
  const theme: ThemeSwitcherValue = context.globals.theme;
  const lightContainer = <div className="light">{children}</div>;
  const darkContainer = <div className="dark">{children}</div>;

  if (!isChromatic() && theme === ThemeSwitcherValue.LIGHT) {
    return lightContainer;
  }

  if (!isChromatic() && theme === ThemeSwitcherValue.DARK) {
    return darkContainer;
  }

  return (
    <div className="flex flex-col gap-10">
      {lightContainer}
      {darkContainer}
    </div>
  );
};

/**
 * Decorator that applies theme-aware styling by inheriting from parent theme class
 */
export const ThemeAwareDecorator = (Story: any, context: any) => {
  return (
    <MemoryRouter>
      <div className="p-32 dark:bg-gray-900 rounded-lg">
        <Story />
      </div>
    </MemoryRouter>
  );
};
