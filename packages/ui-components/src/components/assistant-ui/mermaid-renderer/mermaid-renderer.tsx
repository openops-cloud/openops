import { openOpsId } from '@openops/shared';
import DOMPurify from 'dompurify';
import { t } from 'i18next';
import { Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';
import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { Theme } from '../../../lib/theme';
import { Button } from '../../../ui/button';
import { Dialog, DialogContent, DialogTrigger } from '../../../ui/dialog';

type MermaidRendererProps = {
  chart: string;
  className?: string;
  theme?: Theme;
};

const MermaidRendererImpl = ({
  chart,
  className,
  theme = Theme.DARK,
}: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === Theme.LIGHT ? 'default' : 'dark',
      securityLevel: 'strict',
      fontFamily: 'inherit',
      suppressErrorRendering: true,
    });
  }, [theme]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) {
        return;
      }

      try {
        setError('');
        const id = `mermaid-${openOpsId()}`;

        const { svg: renderedSvg } = await mermaid.render(id, chart);

        // Sanitize the SVG content to prevent XSS attacks
        const sanitizedSvg = sanitizeSvg(renderedSvg);
        setSvg(sanitizedSvg);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
      }
    };

    renderChart();
  }, [chart, theme]);

  if (error) {
    return null;
  }

  if (!svg) {
    return (
      <div
        className={cn(
          'border border-solid rounded bg-background p-4',
          'text-muted-foreground text-sm animate-pulse',
          className,
        )}
      >
        {t('Rendering diagram...')}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          'border border-solid rounded bg-background p-4',
          'flex items-center justify-center overflow-auto',
          'min-h-[120px] max-h-[200px]',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-2 right-4',
              'size-8',
              'bg-background/80 hover:bg-background',
              'border',
              'opacity-70 hover:opacity-100',
            )}
            aria-label="Expand to fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn('max-w-[90vw] w-full h-[90vh]', 'p-6 overflow-auto')}
        >
          <div
            className="flex items-center justify-center w-full h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const sanitizeSvg = (svgContent: string): string => {
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: [
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'text',
      'tspan',
      'marker',
      'defs',
      'clipPath',
      'mask',
    ], // Allow common SVG elements used by mermaid
    ADD_ATTR: [
      'xmlns',
      'viewBox',
      'width',
      'height',
      'x',
      'y',
      'rx',
      'ry',
      'cx',
      'cy',
      'r',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'transform',
      'class',
      'id',
      'd',
      'points',
      'x1',
      'y1',
      'x2',
      'y2',
      'text-anchor',
      'dominant-baseline',
      'font-size',
      'font-family',
      'font-weight',
      'opacity',
      'marker-end',
      'marker-start',
      'clip-path',
      'mask',
    ],
  });
};

export const MermaidRenderer = memo(MermaidRendererImpl);
