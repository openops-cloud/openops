import { X } from 'lucide-react';
import { Badge } from '../../ui/badge';

export enum AiScopeType {
  STEP = 'STEP',
}

export type AiScopeItem = {
  displayName: string;
  logoUrl: string;
  id: string;
  type: AiScopeType;
};

const AiScopeItem = ({
  item,
  onRemove,
}: {
  item: AiScopeItem;
  onRemove: (id: string) => void;
}) => {
  return (
    <Badge
      variant="outline"
      className="w-fit flex items-center gap-1 rounded-xs font-normal truncate"
    >
      {item.displayName}
      <X
        className="h-3 w-3 opacity-50"
        role="button"
        onClick={() => onRemove(item.id)}
      />
    </Badge>
  );
};

export type AiScopeProps = {
  aiScopeItems: AiScopeItem[];
  onAiScopeItemRemove: (id: string) => void;
};

const AiScope = ({ aiScopeItems, onAiScopeItemRemove }: AiScopeProps) => {
  if (!aiScopeItems || aiScopeItems.length === 0) return null;
  return aiScopeItems.map((item) => (
    <AiScopeItem key={item.id} item={item} onRemove={onAiScopeItemRemove} />
  ));
};

AiScope.displayName = 'AiScope';
export { AiScope };
