import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { fireEvent } from '@storybook/testing-library';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Markdown, MarkdownCodeVariations } from '../components';
import { selectLightOrDarkCanvas } from '../test-utils/select-themed-canvas.util';
import { Toaster } from '../ui/toaster';

const queryClient = new QueryClient();

/* Renders a markdown component with support for variables and language text. */
const meta = {
  title: 'components/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  args: {
    handleInject: action('Inject command'),
  },
  argTypes: {
    handleInject: {
      description: 'function to handle the injection of a command',
    },
    markdown: {
      description: 'The markdown content to render',
      control: 'text',
    },
    variables: {
      description: 'The variables to replace in the markdown content',
      control: 'object',
    },
    codeVariation: {
      description: 'The code variation to use',
      control: 'select',
      options: Object.values(MarkdownCodeVariations),
      defaultValue: MarkdownCodeVariations.WithCopy,
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
        <Toaster />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof Markdown>;

/**
 * Shows almost all markdown features, except for code blocks with variables.
 */
export const Miscellaneous: Story = {
  args: {
    markdown: `
# Lorem Ipsum
## Dolor Sit Amet
### Consectetur Adipiscing

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

- Unordered list item 1
- Unordered list item 2
- Unordered list item 3

1. Ordered list item 1
2. Ordered list item 2
3. Ordered list item 3

[Visit OpenOps](https://www.openops.com)

> This is a blockquote with lorem ipsum text.
`,
  },
};

/**
 * Shows almost all markdown features, except for code blocks with variables.
 */
export const WorkflowDocs: Story = {
  args: {
    markdown: `
# Bulk Idle EBS Cleanup

## Overview

This document describes an automated process for identifying and cleaning up idle Amazon Elastic Block Store (EBS) volumes to optimize cloud costs and improve resource utilization as part of FinOps best practices.

## Problem Statement

Idle EBS volumes accumulate over time due to unused or detached instances, leading to unnecessary cloud spend. Manual identification and deletion of these volumes is time-consuming and error-prone.

## Solution

Automate the detection and removal of idle EBS volumes using AWS services and scripts. The automation will:
- Identify unused EBS volumes based on specific criteria (e.g., detached for more than X days, no recent I/O activity).
- Tag volumes for review before deletion.
- Optionally, create snapshots for backup before deletion.
- Delete the identified idle EBS volumes.

## Prerequisites
- AWS CLI configured with appropriate permissions.
- Configured Workflow Automation
- Amazon CloudWatch for monitoring and alerting.
- AWS Identity and Access Management (IAM) roles with permissions to list, tag, snapshot, and delete EBS volumes.

## Implementation Steps

### 1. Identify Idle EBS Volumes
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum

### 2. Tag Volumes for Review
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### 3. Create Snapshots (Optional)
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

\`\`\`text
aws ec2 create-snapshot --volume-id vol-1234567890 --description "Backup before EBS cleanup
\`\`\`

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`,
  },
};

/**
 * Emphasizes the use of code blocks with variables.
 * Various code language and code value combinations are shown.
 */
export const CodeBlocks: Story = {
  args: {
    codeVariation: 'with-copy',
    markdown: `
### Code blocks with variables
Language json 👇
\`\`\`json
  {{json}}
\`\`\`
Language text 👇
\`\`\`text
{{nonUrl}}
\`\`\`
Language URL, invalid URL 👇
\`\`\`url
{{nonUrl}}
\`\`\`
Language URL, valid URL 👇
\`\`\`url
{{url}}
\`\`\``,
    variables: {
      nonUrl: 'This code is a non an URL and is NOT clickable',
      url: 'https://some.clickable.url',
      json: '{"key": "value"}',
    },
  },
  play: async ({ canvasElement }) => {
    const links = selectLightOrDarkCanvas(canvasElement).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://some.clickable.url');
    expect(links[0]).toHaveAttribute('target', '_blank');
  },
};

export const CodeWithoutCopy: Story = {
  args: {
    codeVariation: 'without-copy',
    markdown: `
### Without Copy
\`\`\`text
  {{someCLICommand}}
\`\`\`
`,
    variables: {
      someCLICommand: 'aws s3 sync',
    },
  },
};

export const InjectCommand: Story = {
  args: {
    handleInject: fn(),
    codeVariation: 'with-copy-and-inject',
    markdown: `
### Describe EC2 Instances
\`\`\`text
aws ec2 describe-instances
`,
  },
  play: async ({ canvasElement, args }) => {
    const textarea =
      selectLightOrDarkCanvas(canvasElement).getByRole('textbox');
    expect(textarea).toHaveValue('aws ec2 describe-instances');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('bg-input');

    expect(args.handleInject).not.toHaveBeenCalled();

    const injectButton = selectLightOrDarkCanvas(canvasElement).getByRole(
      'button',
      { name: 'Inject command' },
    );

    fireEvent.click(injectButton);

    expect(args.handleInject).toHaveBeenCalledWith(
      'aws ec2 describe-instances',
    );
  },
};

export const InjectCommandMultiLine: Story = {
  args: {
    codeVariation: 'with-copy-and-inject',
    markdown: `
### S3 Sync
\`\`\`text
aws s3 sync\n  --exclude "*"\n  --include "*.jpg"\n  <local-dir> s3://<bucket-name>
\`\`\`
`,
  },
  play: async ({ canvasElement }) => {
    const textarea =
      selectLightOrDarkCanvas(canvasElement).getByRole('textbox');
    expect(textarea).toHaveValue(
      'aws s3 sync\n  --exclude "*"\n  --include "*.jpg"\n  <local-dir> s3://<bucket-name>',
    );
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('bg-input');
  },
};

export const ComplexExample: Story = {
  args: {
    codeVariation: 'with-copy-and-inject',
    markdown: `
## AWS Infrastructure Management Guide

This guide covers common AWS infrastructure management tasks and their corresponding CLI commands.

### S3 Operations

Basic S3 sync with multiple flags:
\`\`\`text
aws s3 sync
  --delete
  --exclude "*"
  --include "*.jpg"
  --include "*.png"
  --acl public-read
  /local/path s3://my-bucket/
\`\`\`

### EC2 Instance Management

List all running instances with custom output format:
\`\`\`text
aws ec2 describe-instances
  --filters "Name=instance-state-name,Values=running"
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Tags[?Key==\`Name\`].Value|[0]]'
  --output table
\`\`\`

### URL Examples
Valid AWS Console URL:
\`\`\`url
https://console.aws.amazon.com/ec2/v2/home?region=us-west-2
\`\`\`

> **Note**: Always verify your region and account settings before running destructive commands.

### Complex Commands

Start EC2 instance with detailed monitoring and tags:
\`\`\`text
aws ec2 run-instances
  --image-id ami-0123456789abcdef0
  --instance-type t3.micro
  --monitoring Enabled=true
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Environment,Value=Production},{Key=Team,Value=DevOps}]'
  --user-data file://startup-script.sh
\`\`\`

### Single Line Commands
Simple status check:
\`\`\`text
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0
\`\`\`

### Variable Example
Using environment variables:
\`\`\`text
aws s3 cp {{file_path}} s3://{{bucket_name}}/{{target_path}}
\`\`\`

### Edge Cases
Empty command (should handle gracefully):
\`\`\`text

\`\`\`

Very long single line (should handle overflow):
\`\`\`text
aws iam create-role --role-name very-long-role-name-that-might-overflow --assume-role-policy-document file://trust-policy.json --description "This is a very long description that might cause text wrapping issues in the UI component and should be handled gracefully without breaking the layout or making the text unreadable"
\`\`\`
`,
    variables: {
      file_path: '/path/to/file.zip',
      bucket_name: 'my-deployment-bucket',
      target_path: 'releases/v1.0.0/file.zip',
    },
  },
};
