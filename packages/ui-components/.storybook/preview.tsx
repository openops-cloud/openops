import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import '../src/styles/global.css';
import '../src/tailwind.css';
import { ThemeSwitcherDecorator } from './decorators';
import i18n from './i18next';

export enum ThemeSwitcherValue {
  LIGHT = 'Light',
  DARK = 'Dark',
  BOTH = 'Both',
}

export const decorators = [
  (Story, context) => (
    <Suspense fallback={<div>loading translations...</div>}>
      <I18nextProvider i18n={i18n}>
        <ThemeSwitcherDecorator context={context}>
          <Story />
        </ThemeSwitcherDecorator>
      </I18nextProvider>
    </Suspense>
  ),
];

export const tags = ['autodocs'];
export const globalTypes = {
  theme: {
    description: 'Global theme for components',
    toolbar: {
      title: 'Theme',
      icon: 'mirror',
      items: [
        ThemeSwitcherValue.LIGHT,
        ThemeSwitcherValue.DARK,
        ThemeSwitcherValue.BOTH,
      ],
      dynamicTitle: true,
    },
  },
};

export const globals = {
  theme: ThemeSwitcherValue.LIGHT,
};

export const parameters = {
  chromatic: {
    diffThreshold: 0.2,
  },
};
