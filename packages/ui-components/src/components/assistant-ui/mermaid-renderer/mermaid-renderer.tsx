import { openOpsId } from '@openops/shared';
import DOMPurify from 'dompurify';
import { Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';
import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { Theme } from '../../../lib/theme';
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
    });
  }, [theme]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) {
        return;
      }

      try {
        setError('');
        const id = openOpsId();

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
    return (
      <div
        className={cn(
          'border border-destructive rounded bg-destructive/10 p-4',
          'text-destructive text-sm',
          className,
        )}
      >
        <div className="font-semibold mb-2">Mermaid Error:</div>
        <div className="font-mono text-xs">{error}</div>
      </div>
    );
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
        Rendering diagram...
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          'border border-solid rounded bg-background p-4',
          'flex items-center justify-center overflow-auto h-[120px]',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <Dialog>
        <DialogTrigger asChild>
          <button
            className={cn(
              'absolute top-2 right-2',
              'p-2 rounded-md',
              'bg-background/80 hover:bg-background',
              'border border-solid border-border',
              'opacity-70 hover:opacity-100',
              'transition-opacity',
              'cursor-pointer',
            )}
            aria-label="Expand to fullscreen"
          >
            <Maximize2 className="size-4" />
          </button>
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
      'foreignObject',
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
