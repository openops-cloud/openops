import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import {
  Avatar,
  AvatarFallback,
  SelectAllCheckbox,
  SelectForm,
  SelectOption,
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
  type SelectAllChangeAction,
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

  const handleSelectAllAccounts = (action: SelectAllChangeAction) => {
    setSelectedAccounts(
      action === 'selectAll' ? ACCOUNTS.map((a) => a.id) : [],
    );
  };

  const handleSelectAllRegions = (action: SelectAllChangeAction) => {
    setSelectedRegions(action === 'selectAll' ? REGIONS.map((r) => r.id) : []);
  };

  const handleSelectAllServices = (action: SelectAllChangeAction) => {
    setSelectedServices(
      action === 'selectAll' ? SERVICES.map((s) => s.id) : [],
    );
  };

  return (
    <div className="w-[500px] h-[600px] bg-[#FBFBFE] dark:bg-background">
      <Wizard value={currentStep} onValueChange={handleStepChange}>
        <WizardHeader>
          <WizardTitle>Run a Benchmark</WizardTitle>
          <WizardClose onClose={() => alert('Wizard closed')} />
        </WizardHeader>

        <WizardContent>
          <WizardStep value="step1">
            <StepTitle>Let&apos;s create your Benchmark Report!</StepTitle>
            <StepDescription className="!mt-0">
              <button
                type="button"
                onClick={() => alert('Read more functionality')}
                className="text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                Read more here →
              </button>
            </StepDescription>
            <StepDescription className="mt-4">
              In order to do so, we need to create your FinOps Benchmark Report
              of all your potential opportunities.
              <br />
              Which cloud provider do you use?
            </StepDescription>
            <StepBody>
              <SelectForm
                type="single"
                value={cloudProvider}
                onValueChange={setCloudProvider}
              >
                <SelectOption
                  value="aws"
                  icon={
                    <img
                      src="/blocks/aws.png"
                      alt="AWS"
                      className="w-6 h-6 object-contain"
                    />
                  }
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>AWS</span>
                    <span className="font-light">(Not connected)</span>
                  </div>
                  <div className="flex-1" />
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
                </SelectOption>
                <SelectOption
                  value="azure"
                  icon={
                    <img
                      src="/blocks/azure.svg"
                      alt="Azure"
                      className="w-6 h-6"
                    />
                  }
                  disabled
                  className="justify-between opacity-50"
                >
                  <span>Azure</span>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-500">COMING SOON</span>
                </SelectOption>
                <SelectOption
                  value="gcp"
                  icon={
                    <img
                      src="/blocks/google-cloud.svg"
                      alt="Google Cloud"
                      className="w-6 h-6"
                    />
                  }
                  disabled
                  className="justify-between opacity-50"
                >
                  <span>GCP</span>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-500">COMING SOON</span>
                </SelectOption>
              </SelectForm>
            </StepBody>
          </WizardStep>

          <WizardStep value="step2">
            <StepTitle>Choose the AWS connection you want to use</StepTitle>
            <StepDescription className="!mt-0">
              OpenOps can pull data from AWS using the connection you select
              here. We provide a CloudFormation stack that installs the required
              permissions for you.
              <br />
              <br />
              CloudFormation stack:{' '}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Create a read-only role
              </a>
              <br />
              Documentation:{' '}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                How to set up AWS read-only permissions
              </a>
            </StepDescription>
            <StepBody>
              <SelectForm
                type="single"
                value={awsConnection}
                onValueChange={setAwsConnection}
              >
                {CONNECTIONS.map((connection) => (
                  <SelectOption
                    key={connection.id}
                    value={connection.id}
                    icon={
                      <img
                        src="/blocks/aws.png"
                        alt="AWS"
                        className="w-6 h-6 object-contain"
                      />
                    }
                  >
                    {connection.name}
                  </SelectOption>
                ))}
              </SelectForm>
            </StepBody>
          </WizardStep>

          <WizardStep value="step3">
            <StepDescription>
              This connection supports multiple accounts, which of them would
              like to include in the report?
            </StepDescription>
            <StepBody>
              <div className="rounded-lg bg-background shadow-sm">
                <SelectForm
                  type="multi"
                  value={selectedAccounts}
                  onValueChange={setSelectedAccounts}
                  className="border-none shadow-none"
                >
                  <>
                    <div className="px-4 py-3 border-b border-border h-12 flex items-center">
                      <SelectAllCheckbox
                        id="select-all-accounts"
                        selectedCount={selectedAccounts.length}
                        totalCount={ACCOUNTS.length}
                        onSelectAllChange={handleSelectAllAccounts}
                      />
                    </div>
                    {ACCOUNTS.map((account) => (
                      <SelectOption
                        key={account.id}
                        value={account.id}
                        icon={
                          <img
                            src="/blocks/aws.png"
                            alt="AWS"
                            className="w-6 h-6 object-contain"
                          />
                        }
                      >
                        <div className="flex gap-2">
                          <div>{account.name}</div>
                          <div>({account.accountId})</div>
                        </div>
                      </SelectOption>
                    ))}
                  </>
                </SelectForm>
              </div>
            </StepBody>
          </WizardStep>

          <WizardStep value="step4">
            <StepDescription>
              Choose which AWS regions to include in your benchmark report
            </StepDescription>
            <StepBody>
              <div className="border border-border rounded-lg bg-background shadow-sm">
                <SelectForm
                  type="multi"
                  value={selectedRegions}
                  onValueChange={setSelectedRegions}
                  className="border-none shadow-none"
                >
                  <>
                    <div className="px-4 py-3 border-b border-border h-12 flex items-center">
                      <SelectAllCheckbox
                        id="select-all-regions"
                        selectedCount={selectedRegions.length}
                        totalCount={REGIONS.length}
                        onSelectAllChange={handleSelectAllRegions}
                      />
                    </div>
                    {REGIONS.map((region) => (
                      <SelectOption
                        key={region.id}
                        value={region.id}
                        iconClassName="w-8 h-8"
                        icon={
                          <img
                            src="/blocks/region.svg"
                            alt="Region"
                            className="w-full h-full"
                          />
                        }
                      >
                        {region.name}
                      </SelectOption>
                    ))}
                  </>
                </SelectForm>
              </div>
            </StepBody>
          </WizardStep>

          <WizardStep value="step5">
            <StepDescription>
              Choose which AWS services to include in your benchmark report
            </StepDescription>
            <StepBody>
              <div className="border border-border rounded-lg bg-background shadow-sm">
                <SelectForm
                  type="multi"
                  value={selectedServices}
                  onValueChange={setSelectedServices}
                  className="border-none shadow-none"
                >
                  <>
                    <div className="px-4 py-3 border-b border-border h-12 flex items-center">
                      <SelectAllCheckbox
                        id="select-all-services"
                        selectedCount={selectedServices.length}
                        totalCount={SERVICES.length}
                        onSelectAllChange={handleSelectAllServices}
                      />
                    </div>

                    {SERVICES.map((service) => (
                      <SelectOption
                        key={service.id}
                        value={service.id}
                        icon={
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-orange-500 bg-[#FFEDD4] text-[#F54900] text-xs">
                              {service.code}
                            </AvatarFallback>
                          </Avatar>
                        }
                      >
                        {service.name}
                      </SelectOption>
                    ))}
                  </>
                </SelectForm>
              </div>
            </StepBody>
          </WizardStep>
        </WizardContent>

        <WizardFooter>
          {steps.includes(currentStep) && steps.indexOf(currentStep) !== 0 ? (
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
export const BenchmarkWizard: Story = {
  render: () => <WizardExample />,
};
