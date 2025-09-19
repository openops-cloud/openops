import isChromatic from 'chromatic/isChromatic';
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

const fontLoader = async () => {
  const satoshiVariants = [
    '300 16px Satoshi',
    '300 italic 16px Satoshi',
    '400 16px Satoshi',
    '400 italic 16px Satoshi',
    '500 16px Satoshi',
    '500 italic 16px Satoshi',
    '700 16px Satoshi',
    '700 italic 16px Satoshi',
    '900 16px Satoshi',
    '900 italic 16px Satoshi',
  ];

  await Promise.all(satoshiVariants.map((v) => document.fonts.load(v)));
  return { fonts: true };
};

export const loaders =
  isChromatic() && typeof document !== 'undefined' && document.fonts
    ? [fontLoader]
    : [];
