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
    // Initialize mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === Theme.LIGHT ? 'default' : 'dark',
      securityLevel: 'loose',
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
        // Generate a unique ID for each diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to render diagram',
        );
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
          'flex items-center justify-center overflow-auto',
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

export const MermaidRenderer = memo(MermaidRendererImpl);
