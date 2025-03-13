import { FlowDetailsPanel } from '../../flows/components/flow-details-panel';

const SideMenuCollapsed = () => {
  return (
    <div className="flex items-center justify-start bg-background h-[42px] rounded-xl shadow-editor overflow-hidden z-50 p-3 pr-0 max-w-[580px]">
      <FlowDetailsPanel />
    </div>
  );
};

SideMenuCollapsed.displayName = 'SideMenuCollapsed';

export { SideMenuCollapsed };
