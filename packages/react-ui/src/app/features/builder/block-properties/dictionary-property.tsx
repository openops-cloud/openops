import { Button, Input, TextWithIcon } from '@openops/components/ui';
import { t } from 'i18next';
import { Plus, TrashIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

import equal from 'fast-deep-equal';
import { TextInputWithMentions } from './text-input-with-mentions';

type DictionaryInputItem = {
  key: string;
  value: string;
  id: string;
};

type DictionaryInputProps = {
  values: Record<string, string> | undefined;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
  useMentionTextInput?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
};

export const DictionaryProperty = ({
  values,
  onChange,
  disabled,
  useMentionTextInput,
  keyPlaceholder,
  valuePlaceholder,
}: DictionaryInputProps) => {
  const id = useRef(1);
  const valueRef = useRef({});

  const getValuesArray = (values: Record<string, string> | undefined) =>
    Object.entries(values ?? {}).map((el) => {
      id.current++;
      return {
        key: el[0],
        value: el[1],
        id: `${id.current}`,
      };
    });

  const valuesArray = useRef(getValuesArray(values));

  useEffect(() => {
    if (!equal(values, valueRef.current)) {
      valuesArray.current = getValuesArray(values);
    }
  }, [values]);

  const remove = (index: number) => {
    const newValues = valuesArray.current.filter((_, i) => i !== index);
    valuesArray.current = newValues;
    updateValue(newValues);
  };

  const add = () => {
    id.current++;
    const newValues = [
      ...valuesArray.current,
      { key: '', value: '', id: `${id.current}` },
    ];
    valuesArray.current = newValues;
    updateValue(newValues);
  };

  const onChangeValue = (
    index: number,
    value: string | undefined,
    key: string | undefined,
  ) => {
    const newValues = [...valuesArray.current];
    if (value !== undefined) {
      newValues[index].value = value;
    }
    if (key !== undefined) {
      newValues[index].key = key;
    }
    updateValue(newValues);
  };

  const updateValue = (items: DictionaryInputItem[]) => {
    valueRef.current = items.reduce(
      (acc, current) => ({ ...acc, [current.key]: current.value }),
      {},
    );
    onChange(valueRef.current);
  };
  return (
    <div className="flex w-full flex-col gap-4">
      {valuesArray.current.map(({ key, value, id }, index) => (
        <div key={'dictionary-input-' + id} className="flex gap-3 items-center">
          <Input
            value={key}
            disabled={disabled}
            className="basis-[50%] h-full max-w-[50%]"
            onChange={(e) => onChangeValue(index, undefined, e.target.value)}
            placeholder={keyPlaceholder}
          />
          <div className="basis-[50%] max-w-[50%]">
            {useMentionTextInput ? (
              <TextInputWithMentions
                initialValue={value}
                disabled={disabled}
                onChange={(e) => onChangeValue(index, e, undefined)}
                placeholder={valuePlaceholder}
              ></TextInputWithMentions>
            ) : (
              <Input
                value={value}
                disabled={disabled}
                onChange={(e) =>
                  onChangeValue(index, e.target.value, undefined)
                }
                placeholder={valuePlaceholder}
              ></Input>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={disabled}
            onClick={() => remove(index)}
          >
            <TrashIcon className="size-4 text-destructive" aria-hidden="true" />
            <span className="sr-only">{t('Remove')}</span>
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        type="button"
        disabled={disabled}
      >
        <TextWithIcon icon={<Plus size={18} />} text={t('Add Item')} />
      </Button>
    </div>
  );
};
