'use client';

import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  INTERNAL_ERROR_TOAST,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  toast,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export enum LocalesEnum {
  DUTCH = 'nl',
  ENGLISH = 'en',
  GERMAN = 'de',
  ITALIAN = 'it',
  FRENCH = 'fr',
  BULGARIAN = 'bg',
  UKRAINIAN = 'uk',
  HUNGARIAN = 'hu',
  SPANISH = 'es',
  JAPANESE = 'ja',
  INDONESIAN = 'id',
  VIETNAMESE = 'vi',
  CHINESE_SIMPLIFIED = 'zh',
  PORTUGUESE = 'pt',
}

export const localesMap = {
  [LocalesEnum.BULGARIAN]: 'Български',
  [LocalesEnum.CHINESE_SIMPLIFIED]: '简体中文',
  [LocalesEnum.INDONESIAN]: 'Bahasa Indonesia',
  [LocalesEnum.GERMAN]: 'Deutsch',
  [LocalesEnum.ENGLISH]: 'English',
  [LocalesEnum.SPANISH]: 'Español',
  [LocalesEnum.FRENCH]: 'Français',
  [LocalesEnum.ITALIAN]: 'Italiano',
  [LocalesEnum.JAPANESE]: '日本語',
  [LocalesEnum.HUNGARIAN]: 'Magyar',
  [LocalesEnum.DUTCH]: 'Nederlands',
  [LocalesEnum.PORTUGUESE]: 'Português (Brasil)',
  [LocalesEnum.UKRAINIAN]: 'Українська',
  [LocalesEnum.VIETNAMESE]: 'Tiếng Việt',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languageWithoutLocale = i18n.language?.includes('-')
    ? i18n.language.split('-')[0]
    : i18n.language;
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(
    languageWithoutLocale ?? 'en',
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => {
      setSelectedLanguage(value);
      return i18n.changeLanguage(value);
    },
    onSuccess: () => {
      setIsOpen(false);
      window.location.reload();
    },
    onError: (error) => {
      console.error(error);
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {t('Select the language that will be used in the dashboard.')}
      </div>
      <div className="flex flex-col">
        <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              loading={isPending}
              className={cn(
                'w-[200px] justify-between',
                !selectedLanguage && 'text-muted-foreground',
              )}
            >
              {selectedLanguage
                ? localesMap[selectedLanguage as LocalesEnum]
                : i18n.t('Select language')}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder={i18n.t('Search language...')} />
              <CommandList>
                <ScrollArea className="h-[300px]">
                  <CommandEmpty>{i18n.t('No language found.')}</CommandEmpty>
                  <CommandGroup>
                    {Object.entries(localesMap).map(([value, label]) => (
                      <CommandItem
                        value={value}
                        key={value}
                        onSelect={(value) => mutate(value)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === selectedLanguage
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
