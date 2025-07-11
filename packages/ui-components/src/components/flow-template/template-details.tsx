import { Trigger } from '@openops/shared';
import { BlockIcon } from '../block-icon/block-icon';

import { EdgeTypes, NodeTypes } from '@xyflow/react';
import { t } from 'i18next';
import { ArrowLeft, ExpandIcon, PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';

import { OverflowTooltip } from '../overflow-tooltip';
import { FlowTemplateMetadataWithIntegrations } from './types';

import { DialogDescription } from '../../ui/dialog';
import { LoadingSpinner } from '../../ui/spinner';
import { BlockIconList } from '../block-icon';
import { Markdown } from '../custom';
import { TemplateCanvas } from './template-canvas';

type TemplateDetailsProps = {
  templateMetadata: FlowTemplateMetadataWithIntegrations;
  close?: () => void;
  useTemplate: () => void;
  expandPreview: () => void;
  edgeTypes: EdgeTypes;
  nodeTypes: NodeTypes;
  template: Trigger | undefined;
  ownerLogoUrl: string;
  theme: string;
};

const DESCRIPTION_MAX_LINES = 4;

export const TemplateDetails = ({
  templateMetadata,
  template,
  edgeTypes,
  nodeTypes,
  close,
  useTemplate,
  expandPreview,
  ownerLogoUrl,
  theme,
}: TemplateDetailsProps) => {
  const [showFullDescription, setShowFullDescription] =
    useState<boolean>(false);

  const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
    useState<boolean>(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (descriptionRef.current) {
      const element = descriptionRef.current;
      const lineHeight = parseFloat(
        window.getComputedStyle(element).lineHeight,
      );
      setIsDescriptionOverflowing(
        element.scrollHeight > lineHeight * DESCRIPTION_MAX_LINES,
      );
    }
  }, [templateMetadata.description]);

  const toggleDescription = () => setShowFullDescription((prev) => !prev);

  return (
    <div className="w-full h-full flex flex-col gap-[21px] pl-[42px] pt-[38px]">
      <div className="w-full flex items-center gap-5 pr-5">
        {close && (
          <ArrowLeft
            role="button"
            scale={1}
            onClick={close}
            className="w-6 h-6"
          ></ArrowLeft>
        )}
        <OverflowTooltip
          className="flex-1 text-[32px] font-bold text-primary-300 dark:text-primary"
          text={templateMetadata.name}
        ></OverflowTooltip>
        <Button
          className="flex gap-2 items-center justify-end ml-auto"
          onClick={useTemplate}
        >
          <PencilLine />
          {t('Use template')}
        </Button>
      </div>
      <ScrollArea
        className="h-full"
        type={showFullDescription ? 'always' : 'auto'}
      >
        <div
          className={cn('flex flex-col gap-[15px] pr-[27px]', {
            'h-full': !showFullDescription,
          })}
        >
          <div className="flex items-center gap-[6px]">
            <BlockIcon
              showTooltip={false}
              logoUrl={ownerLogoUrl}
              circle={true}
              size={'sm'}
              className="p-1 bg-blue-50"
            ></BlockIcon>
            <span>By OpenOps</span>
          </div>

          <div>
            <DialogDescription
              ref={descriptionRef}
              className={cn('text-base text-black dark:text-white h-fit', {
                'line-clamp-4': !showFullDescription,
              })}
            >
              <Markdown
                markdown={templateMetadata.description}
                withBorder={false}
                theme={theme}
              />
            </DialogDescription>
            {isDescriptionOverflowing && (
              <Button
                variant="link"
                className="p-0 font-medium text-base text-blueAccent"
                onClick={toggleDescription}
              >
                {showFullDescription ? t('Show less') : t('Show more')}
              </Button>
            )}
          </div>

          <div className="flex gap-[15px] items-center">
            <p className="text-black dark:text-white">{t('Integrations: ')}</p>
            <BlockIconList
              metadata={templateMetadata.integrations}
              maxNumberOfIconsToShow={20}
            ></BlockIconList>
          </div>

          <div
            className={cn(
              'w-full flex items-center justify-center mb-6 bg-editorBackground relative rounded-2xl overflow-hidden border',
              {
                'flex-1': !showFullDescription,
                'h-[500px]': showFullDescription,
              },
            )}
          >
            {template ? (
              <>
                <Button
                  variant="outline"
                  className="absolute right-4 top-4 z-10 flex gap-2"
                  onClick={expandPreview}
                >
                  <ExpandIcon />
                  {t('Expand preview')}
                </Button>
                <TemplateCanvas
                  edgeTypes={edgeTypes}
                  nodeTypes={nodeTypes}
                  template={template}
                  topOffset={20}
                />
              </>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
