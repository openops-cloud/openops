import removeMarkdown from 'markdown-to-text';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { FlowTemplateMetadataWithIntegrations } from './types';

type TemplateCardTextProps = {
  templateMetadata: FlowTemplateMetadataWithIntegrations;
  headerMaxLines?: number;
  totalMaxLines?: number;
  headerClassName?: string;
  descriptionClassName?: string;
};

export const TemplateCardText = ({
  templateMetadata,
  headerMaxLines = 2,
  totalMaxLines = 4,
  headerClassName,
  descriptionClassName,
}: TemplateCardTextProps) => {
  const [descriptionLines, setDescriptionLines] = useState(0);
  const templateNameRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (templateNameRef.current) {
      const lineHeight = parseFloat(
        getComputedStyle(templateNameRef.current).lineHeight,
      );
      const titleHeight = templateNameRef.current.clientHeight;
      const titleLines = Math.round(titleHeight / lineHeight);
      setDescriptionLines(totalMaxLines - titleLines);
    }
  }, [templateMetadata.name, totalMaxLines]);

  return (
    <div className="flex flex-col gap-1">
      <h3
        ref={templateNameRef}
        className={cn('font-bold overflow-hidden', headerClassName)}
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: headerMaxLines,
        }}
      >
        {templateMetadata.name}
      </h3>
      {descriptionLines && (
        <p
          className={cn(
            'text-sm font-normal overflow-hidden',
            descriptionClassName,
          )}
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: descriptionLines,
          }}
        >
          {removeMarkdown(templateMetadata.description || '')}
        </p>
      )}
    </div>
  );
};
