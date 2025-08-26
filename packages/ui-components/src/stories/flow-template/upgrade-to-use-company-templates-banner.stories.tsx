import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { UpgradeToUseCompanyTemplatesBanner } from '../../components/flow-template/upgrade-to-use-company-templates-banner';

/**
 * Banner prompting users to upgrade to enable custom templates.
 */
const meta = {
  title: 'Components/UpgradeToUseCompanyTemplatesBanner',
  component: UpgradeToUseCompanyTemplatesBanner,
  tags: ['autodocs'],
  args: {
    link: 'https://openops.com/contact',
  },
  decorators: [ThemeAwareDecorator],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof UpgradeToUseCompanyTemplatesBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default banner with a sample upgrade link.
 */
export const Default: Story = {};
