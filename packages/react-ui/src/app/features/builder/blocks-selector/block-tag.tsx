import { cn } from '@openops/components/ui';
import { cva, type VariantProps } from 'class-variance-authority';

const tagVariants = cva(
  'text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg cursor-pointer border-[2px] border-transparent',
  {
    variants: {
      variant: {
        pink: 'bg-fuchsia-600/20 text-primary-800 hover:border-fuchsia-500 data-[selected=true]:border-fuchsia-600',
        yellow:
          'bg-yellow-500/20 text-primary-800 hover:border-yellow-500 data-[selected=true]:border-yellow-500',
        indigo:
          'bg-indigo-600/20 text-primary-800 hover:border-indigo-500 data-[selected=true]:border-indigo-600',
        blue: 'bg-blue-500/20 text-primary-800 hover:border-blue-500 data-[selected=true]:border-blue-500',
        green:
          'bg-green-500/20 text-primary-800 hover:border-green-500 data-[selected=true]:border-green-500',
      },
    },
  },
);

export interface BlockTagProps extends VariantProps<typeof tagVariants> {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void;
}

const BlockTag = ({ variant, children, selected, onClick }: BlockTagProps) => {
  return (
    <span
      className={cn(tagVariants({ variant }))}
      data-selected={selected}
      onClick={onClick}
    >
      {children}
    </span>
  );
};

BlockTag.displayName = 'BlockTag';
export { BlockTag };
