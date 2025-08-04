import isChromatic from 'chromatic/isChromatic';
import React, { useEffect, useRef, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/global.css';
import '../src/tailwind.css';
import { Toaster } from '../src/ui/toaster';
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
      <Toaster />
    </MemoryRouter>
  );
};

/**
 * Generic container component that detects theme and passes it to child components.
 * Can be used to wrap any component that accepts a theme prop.

 */
export const ThemeAwareContainer = ({
  component: Component,
  ...props
}: {
  component: React.ComponentType<any>;
  [key: string]: any;
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detectTheme = () => {
      const element = containerRef.current;
      if (!element) return;

      // Look for theme class on the element or its ancestors
      let current = element as HTMLElement | null;
      while (current) {
        if (current.classList.contains('light')) {
          setTheme('light');
          return;
        } else if (current.classList.contains('dark')) {
          setTheme('dark');
          return;
        }
        current = current.parentElement;
      }

      // Fallback: check document body for theme class
      if (
        document.body.classList.contains('dark') ||
        document.documentElement.classList.contains('dark')
      ) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    };

    detectTheme();

    // Create a MutationObserver to watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full">
      <Component {...props} theme={theme} />
    </div>
  );
};
