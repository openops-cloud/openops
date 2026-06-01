import {
  BlockSelectorOperation,
  BlockStepMetadataWithSuggestions,
  CardListItem,
  ItemListMetadata,
  StepMetadata,
  StepMetadataWithSuggestions,
} from '@openops/components/ui';
import { FlowOperationType } from '@openops/shared';
import { GearIcon } from '@radix-ui/react-icons';

type HandleSelectCallback = (
  block: StepMetadata | undefined,
  item: ItemListMetadata,
) => void;

type BlockOperationSuggestionsProps = {
  blockMetadata: StepMetadataWithSuggestions;
  handleSelectOperationSuggestion: HandleSelectCallback;
  operation: BlockSelectorOperation;
};

const BlockOperationSuggestions = ({
  blockMetadata,
  handleSelectOperationSuggestion,
  operation,
}: BlockOperationSuggestionsProps) => {
  const blockSuggestions = blockMetadata as BlockStepMetadataWithSuggestions;
  const suggestions =
    operation.type === FlowOperationType.UPDATE_TRIGGER
      ? blockSuggestions.suggestedTriggers
      : blockSuggestions.suggestedActions;

  return (
    <>
      <div className="mt-0.5" />
      {suggestions?.map((suggestion: ItemListMetadata) => (
        <CardListItem
          className="p-2 px-0 text-sm gap-2 items-start transition-transform duration-200 ease-in-out hover:scale-105 hover:font-bold"
          key={suggestion.name}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectOperationSuggestion(blockMetadata, suggestion);
          }}
        >
          <GearIcon className="w-2 mt-0.5" />
          <span className="truncate" title={suggestion.displayName}>
            {suggestion.displayName}
          </span>
        </CardListItem>
      ))}
    </>
  );
};

export { BlockOperationSuggestions };
