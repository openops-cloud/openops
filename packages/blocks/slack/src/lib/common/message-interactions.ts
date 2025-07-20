import { isEmpty } from '@openops/shared';
import { array } from 'zod';

export interface InteractionPayload {
  userName: string;
  actionClicked: string;
  actionType: string;
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

export function buildActionBlock(
  user: string,
  userSelection: UserSelection | UserSelection[],
) {
  const clickedOnText = Array.isArray(userSelection)
    ? userSelection.map((opt) => opt.displayText).join(', ')
    : userSelection.displayText;

  const whoClickedText = !isEmpty(user)
    ? `user @${user} clicked on '${clickedOnText}'`
    : `clicked on '${clickedOnText}'`;

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

export function parseUserSelection(
  userSelection: string,
  actionType: string,
): UserSelection | UserSelection[] {
  if (actionType === 'button') {
    return {
      value: userSelection,
      displayText: userSelection,
    };
  }
  const parsedSelection = JSON.parse(userSelection);

  return parsedSelection;
}

export interface UserSelection {
  value: string;
  displayText: string;
}
