import { BlockTag } from '@/app/features/builder/blocks-selector/block-tag';
import { ScrollArea, ScrollBar } from '@openops/components/ui';
import { BlockCategory } from '@openops/shared';
import { t } from 'i18next';

export const ALL_KEY = 'All';

export type TagKey = BlockCategory | string;

const tags: Record<
  TagKey,
  {
    title: string;
    color: 'green' | 'blue' | 'purple' | 'yellow' | 'pink';
  }
> = {
  [ALL_KEY]: {
    title: 'All',
    color: 'blue',
  },
  [BlockCategory.CLOUD]: {
    title: 'Cloud',
    color: 'green',
  },
  [BlockCategory.COMMUNICATION]: {
    title: 'Communication',
    color: 'purple',
  },
  [BlockCategory.CORE]: {
    title: 'Utils',
    color: 'yellow',
  },
  [BlockCategory.DATA]: {
    title: 'Data',
    color: 'pink',
  },
  [BlockCategory.FINOPS]: {
    title: 'FinOps',
    color: 'green',
  },
  [BlockCategory.IaC]: {
    title: 'IaC',
    color: 'blue',
  },
  [BlockCategory.NETWORK]: {
    title: 'Network',
    color: 'purple',
  },
  [BlockCategory.PROJECT_MANAGEMENT]: {
    title: 'Project Management',
    color: 'yellow',
  },
  [BlockCategory.WORKFLOW]: {
    title: 'Workflow',
    color: 'green',
  },
};
type BlockTagGroupProps = {
  selectedTag?: TagKey;
  onSelectTag: (tag: TagKey) => void;
};

const BlockTagGroup = ({ selectedTag, onSelectTag }: BlockTagGroupProps) => {
  return (
    <ScrollArea>
      <div className="flex py-2 px-2 items-center mb-1">
        {Object.entries(tags).map(([tag, tagData]) => (
          <BlockTag
            key={tagData.title}
            variant={tagData.color}
            onClick={(e) => {
              onSelectTag(selectedTag === tag ? ALL_KEY : tag);
              e.stopPropagation();
            }}
            selected={selectedTag === tag}
          >
            <div className="flex items-center w-fit text-nowrap">
              {t(tagData.title)}
            </div>
          </BlockTag>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

BlockTagGroup.displayName = 'BlockTagGroup';
export { BlockTagGroup };
