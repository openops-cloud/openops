import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import {
  Avatar,
  AvatarFallback,
  Checkbox,
  Label,
  ListItem,
  RadioGroup,
  RadioGroupItem,
  RegionIcon,
  SelectAllCheckbox,
  StepBody,
  StepCounter,
  StepDescription,
  StepTitle,
  Wizard,
  WizardClose,
  WizardContent,
  WizardFooter,
  WizardHeader,
  WizardNext,
  WizardPrevious,
  WizardStep,
  WizardTitle,
} from '../../index';

const CONNECTIONS = [
  { id: 'aws-prod', name: 'AWS - Production' },
  { id: 'aws-billing', name: 'AWS - Billing' },
  { id: 'aws-readonly', name: 'AWS - Read only' },
  { id: 'aws-sandbox', name: 'AWS - Sandbox' },
  { id: 'aws-platform', name: 'AWS - Platform Team' },
];

const ACCOUNTS = [
  { id: 'aws-prod', name: 'AWS Production', accountId: '123456789012' },
  { id: 'aws-staging', name: 'AWS Staging', accountId: '234567890123' },
  { id: 'aws-dev', name: 'AWS Development', accountId: '345678901234' },
  { id: 'aws-sandbox', name: 'AWS Sandbox', accountId: '456789012345' },
  {
    id: 'aws-security',
    name: 'AWS Security Testing',
    accountId: '889900112244',
  },
];

const REGIONS = [
  { id: 'us-east-1', name: 'us-east-1' },
  { id: 'us-west-2', name: 'us-west-2' },
  { id: 'eu-west-1', name: 'eu-west-1' },
  { id: 'eu-central-1', name: 'eu-central-1' },
  { id: 'ap-southeast-1', name: 'ap-southeast-1' },
];

const SERVICES = [
  { id: 'ec2', name: 'EC2', code: 'EC' },
  { id: 'rds', name: 'RDS', code: 'RD' },
  { id: 's3', name: 'S3', code: 'S3' },
  { id: 'lambda', name: 'Lambda', code: 'La' },
  { id: 'ecs', name: 'ECS', code: 'EC' },
  { id: 'eks', name: 'EKS', code: 'EK' },
  { id: 'dynamodb', name: 'DynamoDB', code: 'Dy' },
  { id: 'elasticache', name: 'ElastiCache', code: 'El' },
  { id: 'redshift', name: 'Redshift', code: 'Re' },
];

interface ConnectionRadioButtonProps {
  connection: { id: string; name: string };
  isLast: boolean;
}

const ConnectionRadioButton = ({
  connection,
  isLast,
}: ConnectionRadioButtonProps) => (
  <ListItem hasSeparator={!isLast}>
    <RadioGroupItem value={connection.id} id={`connection-${connection.id}`} />
    <Label
      htmlFor={`connection-${connection.id}`}
      className="flex items-center space-x-4 cursor-pointer"
    >
      <img src="/blocks/aws.png" alt="AWS" className="w-6 h-6 object-contain" />
      <span>{connection.name}</span>
    </Label>
  </ListItem>
);

interface AccountCheckboxProps {
  account: { id: string; name: string; accountId: string };
  checked: boolean;
  onToggle: () => void;
  isLast: boolean;
}

const AccountCheckbox = ({
  account,
  checked,
  onToggle,
  isLast,
}: AccountCheckboxProps) => (
  <ListItem hasSeparator={!isLast}>
    <Checkbox
      id={`account-${account.id}`}
      checked={checked}
      onCheckedChange={onToggle}
      className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
    />
    <Label
      htmlFor={`account-${account.id}`}
      className="flex items-center space-x-4 cursor-pointer"
    >
      <img src="/blocks/aws.png" alt="AWS" className="w-6 h-6 object-contain" />
      <span>
        {account.name} ({account.accountId})
      </span>
    </Label>
  </ListItem>
);

interface RegionCheckboxProps {
  region: { id: string; name: string };
  checked: boolean;
  onToggle: () => void;
  isLast: boolean;
}

const RegionCheckbox = ({
  region,
  checked,
  onToggle,
  isLast,
}: RegionCheckboxProps) => (
  <ListItem hasSeparator={!isLast}>
    <Checkbox
      id={`region-${region.id}`}
      checked={checked}
      onCheckedChange={onToggle}
      className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
    />
    <Label
      htmlFor={`region-${region.id}`}
      className="flex items-center space-x-4 cursor-pointer"
    >
      <div className="w-6 h-6 p-1 rounded bg-[#DBEAFE] flex items-center justify-center">
        <RegionIcon size={16} color="#155DFC" />
      </div>
      <span>{region.name}</span>
    </Label>
  </ListItem>
);

interface ServiceCheckboxProps {
  service: { id: string; name: string; code: string };
  checked: boolean;
  onToggle: () => void;
  isLast: boolean;
}

const ServiceCheckbox = ({
  service,
  checked,
  onToggle,
  isLast,
}: ServiceCheckboxProps) => (
  <ListItem hasSeparator={!isLast}>
    <Checkbox
      id={`service-${service.id}`}
      checked={checked}
      onCheckedChange={onToggle}
      className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
    />
    <Label
      htmlFor={`service-${service.id}`}
      className="flex items-center space-x-4 cursor-pointer"
    >
      <Avatar className="w-6 h-6">
        <AvatarFallback className="bg-[#FFEDD4] text-[#F54900] text-xs font-bold">
          {service.code}
        </AvatarFallback>
      </Avatar>
      <span>{service.name}</span>
    </Label>
  </ListItem>
);

type WizardStep = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

const WizardExample = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('step1');
  const [cloudProvider, setCloudProvider] = useState('');
  const [awsConnection, setAwsConnection] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const steps: WizardStep[] = ['step1', 'step2', 'step3', 'step4', 'step5'];

  const handleStepChange = (value: string) => {
    setCurrentStep(value as WizardStep);
  };

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'step1':
        return cloudProvider !== '';
      case 'step2':
        return awsConnection !== '';
      case 'step3':
        return selectedAccounts.length > 0;
      case 'step4':
        return selectedRegions.length > 0;
      case 'step5':
        return selectedServices.length > 0;
      default:
        return false;
    }
  };
  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId],
    );
  };

  const handleSelectAllAccounts = () => {
    const allAccountIds = ACCOUNTS.map((account) => account.id);
    setSelectedAccounts(
      selectedAccounts.length === allAccountIds.length ? [] : allAccountIds,
    );
  };
  const handleRegionToggle = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region],
    );
  };

  const handleSelectAllRegions = () => {
    const allRegionIds = REGIONS.map((region) => region.id);
    setSelectedRegions(
      selectedRegions.length === allRegionIds.length ? [] : allRegionIds,
    );
  };
  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const handleSelectAllServices = () => {
    const allServiceIds = SERVICES.map((service) => service.id);
    setSelectedServices(
      selectedServices.length === allServiceIds.length ? [] : allServiceIds,
    );
  };

  return (
    <div className="w-[500px] h-[600px]">
      <Wizard value={currentStep} onValueChange={handleStepChange}>
        <WizardHeader>
          <WizardTitle>Run a Benchmark</WizardTitle>
          <WizardClose onClose={() => alert('Wizard closed')} />
        </WizardHeader>

        <WizardContent>
          <WizardStep value="step1">
            <StepTitle>Let&apos;s create your Benchmark Report!</StepTitle>
            <StepDescription>
              <a href="#" className="text-blue-600">
                Read more here →
              </a>
            </StepDescription>
            <StepDescription className="mt-4">
              In order to do so, we need to create your FinOps Benchmark Report
              of all your potential opportunities.
              <br />
              Which cloud provider do you use?
            </StepDescription>
            <StepBody>
              <RadioGroup
                value={cloudProvider}
                onValueChange={setCloudProvider}
                className="gap-0"
              >
                <div className="flex items-center border-b border-border px-3">
                  <RadioGroupItem value="aws" id="provider-aws" />
                  <Label
                    htmlFor="provider-aws"
                    className="flex items-center justify-between w-full cursor-pointer p-3 hover:bg-accent/50"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src="/blocks/aws.png"
                        alt="AWS"
                        className="w-6 h-6 object-contain"
                      />
                      <span className="font-semibold">AWS</span>
                      <span>(Not connected)</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          alert('Connect AWS');
                        }}
                        className="text-primary-200 text-sm"
                      >
                        Connect
                      </button>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center border-b border-border opacity-50 px-3">
                  <RadioGroupItem value="azure" id="provider-azure" disabled />
                  <Label
                    htmlFor="provider-azure"
                    className="flex items-center justify-between w-full cursor-not-allowed p-3"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src="/blocks/azure.svg"
                        alt="Azure"
                        className="w-6 h-6"
                      />
                      <span>Azure</span>
                    </div>
                    <span className="text-xs text-gray-500">COMING SOON</span>
                  </Label>
                </div>
                <div className="flex items-center opacity-50 px-3">
                  <RadioGroupItem value="gcp" id="provider-gcp" disabled />
                  <Label
                    htmlFor="provider-gcp"
                    className="flex items-center justify-between w-full cursor-not-allowed p-3"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src="/blocks/google-cloud.svg"
                        alt="Google Cloud"
                        className="w-6 h-6"
                      />
                      <span>GCP</span>
                    </div>
                    <span className="text-xs text-gray-500">COMING SOON</span>
                  </Label>
                </div>
              </RadioGroup>
            </StepBody>
          </WizardStep>

          <WizardStep value="step2">
            <StepTitle>Great! Which AWS connection?</StepTitle>
            <StepDescription>
              Pick the AWS connection you would like to use
            </StepDescription>
            <StepBody>
              <RadioGroup
                value={awsConnection}
                onValueChange={setAwsConnection}
                className="gap-0"
              >
                {CONNECTIONS.map((connection, index) => (
                  <ConnectionRadioButton
                    key={connection.id}
                    connection={connection}
                    isLast={index === CONNECTIONS.length - 1}
                  />
                ))}
              </RadioGroup>
            </StepBody>
          </WizardStep>

          <WizardStep value="step3">
            <StepTitle>Select Accounts</StepTitle>
            <StepDescription>
              Choose which AWS accounts to include in your benchmark report
            </StepDescription>
            <StepBody>
              <ListItem hasSeparator>
                <SelectAllCheckbox
                  id="select-all-accounts"
                  checked={
                    selectedAccounts.length === ACCOUNTS.length
                      ? true
                      : selectedAccounts.length > 0
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={() => handleSelectAllAccounts()}
                  label="Select all"
                />
              </ListItem>
              {ACCOUNTS.map((account, index) => (
                <AccountCheckbox
                  key={account.id}
                  account={account}
                  checked={selectedAccounts.includes(account.id)}
                  onToggle={() => handleAccountToggle(account.id)}
                  isLast={index === ACCOUNTS.length - 1}
                />
              ))}
            </StepBody>
          </WizardStep>

          <WizardStep value="step4">
            <StepTitle>Select Regions</StepTitle>
            <StepDescription>
              Choose which AWS regions to include in your benchmark report
            </StepDescription>
            <StepBody>
              <ListItem hasSeparator>
                <SelectAllCheckbox
                  id="select-all-regions"
                  checked={
                    selectedRegions.length === REGIONS.length
                      ? true
                      : selectedRegions.length > 0
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={() => handleSelectAllRegions()}
                  label="Select all"
                />
              </ListItem>
              {REGIONS.map((region, index) => (
                <RegionCheckbox
                  key={region.id}
                  region={region}
                  checked={selectedRegions.includes(region.id)}
                  onToggle={() => handleRegionToggle(region.id)}
                  isLast={index === REGIONS.length - 1}
                />
              ))}
            </StepBody>
          </WizardStep>

          <WizardStep value="step5">
            <StepTitle>Select Services</StepTitle>
            <StepDescription>
              Choose which AWS services to include in your benchmark report
            </StepDescription>
            <StepBody>
              <ListItem hasSeparator>
                <SelectAllCheckbox
                  id="select-all-services"
                  checked={
                    selectedServices.length === SERVICES.length
                      ? true
                      : selectedServices.length > 0
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={() => handleSelectAllServices()}
                  label="Select all"
                />
              </ListItem>
              {SERVICES.map((service, index) => (
                <ServiceCheckbox
                  key={service.id}
                  service={service}
                  checked={selectedServices.includes(service.id)}
                  onToggle={() => handleServiceToggle(service.id)}
                  isLast={index === SERVICES.length - 1}
                />
              ))}
            </StepBody>
          </WizardStep>
        </WizardContent>

        <WizardFooter>
          {steps.indexOf(currentStep) > 0 ? (
            <WizardPrevious />
          ) : (
            <div className="w-[112px]" />
          )}
          <StepCounter current={steps.indexOf(currentStep) + 1} total={5} />
          <WizardNext disabled={!isCurrentStepValid()} />
        </WizardFooter>
      </Wizard>
    </div>
  );
};

const meta = {
  title: 'ui/Wizard',
  component: Wizard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Wizard>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: () => <WizardExample />,
};
