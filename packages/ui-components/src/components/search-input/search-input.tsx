import { t } from 'i18next';
import { Search } from 'lucide-react';
import { useCallback } from 'react';
import { Input } from '../../ui/input';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput = ({
  value,
  onChange,
  className = '',
  placeholder = 'Search...',
}: SearchInputProps) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div className={`relative w-full ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
      <Input
        type="search"
        placeholder={t(placeholder)}
        className="pl-9 pr-4 bg-muted border-none"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

SearchInput.displayName = 'SearchInput';
export { SearchInput };
