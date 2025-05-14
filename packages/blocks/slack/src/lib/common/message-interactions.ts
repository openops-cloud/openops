import { isEmpty } from '@openops/shared';

export interface InteractionPayload {
  userName: string;
  actionClicked: string;
  path: string;
}

export function removeActionBlocks(blocks: any): any[] {
  return blocks.reduce((acc: any[], block: any) => {
    if (block.type === 'actions') {
      return acc;
    }

    if (
      block.type === 'section' &&
      block.accessory &&
      block.accessory.type !== 'image'
    ) {
      const { accessory, ...rest } = block;
      acc.push(rest);
    } else {
      acc.push(block);
    }

    return acc;
  }, []);
}

export function buildActionBlock(user: string, button: string) {
  const whoClickedText = !isEmpty(user)
    ? `user @${user} clicked on '${button}'`
    : `clicked on '${button}'`;

  const modifiedBlocks = [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*:white_check_mark: Action received: ${whoClickedText}*`,
      },
    },
  ];

  return modifiedBlocks;
}

export function buildExpiredMessageBlock() {
  const modifiedBlocks = [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*:exclamation: The time to act on this message has expired.*',
      },
    },
  ];

  return modifiedBlocks;
}
