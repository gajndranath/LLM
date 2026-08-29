import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import ErrorBoundary from './ErrorBoundary';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    primaryColor: '#3b82f6',
    lineColor: '#64748b',
    textColor: '#f1f5f9',
  },
  er: {
    useMaxWidth: false,
  },
  flowchart: {
    useMaxWidth: false,
  },
  sequence: {
    useMaxWidth: false,
  }
});

interface MermaidProps {
  chart: string;
}

// Robust sanitization function to fix common LLM Mermaid syntax errors
function sanitizeMermaidChart(chart: string): string {
  if (!chart) return '';

  let cleaned = chart
    .replace(/\\n/g, '\n') // Fix escaped newlines
    .replace(/```mermaid/g, '') // Remove code blocks
    .replace(/```/g, '')
    .trim();

  // If it's an ER diagram, clean up fields inside table definitions
  if (cleaned.startsWith('erDiagram')) {
    const lines = cleaned.split('\n');
    let insideTable = false;

    const sanitizedLines = lines.map(line => {
      let trimmed = line.trim();

      if (trimmed.includes('{') && !trimmed.includes('--')) {
        insideTable = true;
        return line;
      }
      if (trimmed.includes('}') && !trimmed.includes('--')) {
        insideTable = false;
        return line;
      }

      if (insideTable && trimmed.length > 0) {
        // Remove parentheses contents (e.g. varchar(255) -> varchar)
        trimmed = trimmed.replace(/\([^)]*\)/g, '');

        // Normalize common Postgres types with spaces
        trimmed = trimmed
          .replace(/timestamp with time zone/gi, 'timestamptz')
          .replace(/timestamp without time zone/gi, 'timestamp')
          .replace(/character varying/gi, 'varchar')
          .replace(/double precision/gi, 'double')
          .replace(/bigint/gi, 'bigint')
          .replace(/primary key/gi, '')
          .replace(/foreign key/gi, '');

        // Split tokens (type, column, keys)
        const tokens = trimmed.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          const type = tokens[0];
          const column = tokens[1];
          const keyRaw = tokens.slice(2).join(' '); // e.g. PK, FK, NOT NULL

          // Ensure type is valid alphanumeric or wrapped in double quotes
          let safeType = type;
          if (!/^[a-zA-Z0-9_]+$/.test(type)) {
            safeType = `"${type}"`;
          }

          // Ensure column name is safe alphanumeric snake_case
          const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');

          // Wrap unknown keys (like NOT NULL) in quotes for Mermaid
          let safeKey = keyRaw;
          if (keyRaw && !/^(PK|FK|UK)$/i.test(keyRaw)) {
            safeKey = `"${keyRaw.replace(/"/g, '')}"`;
          }

          return `    ${safeType} ${safeColumn} ${safeKey}`;
        }
      }
      return line;
    });

    cleaned = sanitizedLines.join('\n');
  }

  return cleaned;
}

const MermaidChart: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reactId = React.useId().replace(/:/g, '');
  const idRef = useRef(`mermaid-${reactId}`);

  useEffect(() => {
    if (chart) {
      const renderChart = async () => {
        try {
          const sanitized = sanitizeMermaidChart(chart);
          const { svg: renderedSvg } = await mermaid.render(idRef.current, sanitized);
          setSvg(renderedSvg);
        } catch (error) {
          console.error("Mermaid Render Error:", error);
          setSvg('<div class="text-red-500 text-[11px] font-bold p-4 bg-red-500/5 border border-red-500/10 rounded-xl">⚠️ Schema Diagram rendering failed. Syntax error.</div>');
        }
      };
      renderChart();
    }
  }, [chart]);

  if (!chart) return null;

  return (
    <div className="w-full flex flex-col space-y-2 relative group/mermaid">
      <style>{`
        .mermaid-container svg {
          max-width: 100% !important;
          height: auto !important;
          min-width: 500px;
        }
      `}</style>

      {/* Inline Render with Pan/Zoom & Trackpad drag */}
      <div className="relative border border-white/5 rounded-2xl overflow-hidden bg-slate-950/40 shadow-inner">
        <TransformWrapper
          initialScale={1}
          minScale={0.2}
          maxScale={4}
          centerOnInit={true}
          wheel={{ step: 0.08 }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Floating Quick Pan/Zoom & Fullscreen Controls */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl">
                <button onClick={() => zoomIn()} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Zoom In"><ZoomIn size={13} /></button>
                <button onClick={() => zoomOut()} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Zoom Out"><ZoomOut size={13} /></button>
                <button onClick={() => resetTransform()} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Reset Scale"><Move size={13} /></button>
                <div className="w-px h-3.5 bg-white/10 mx-0.5" />
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Fullscreen Expand"
                >
                  <Maximize2 size={13} />
                </button>
              </div>

              <TransformComponent wrapperStyle={{ width: '100%', height: '420px', cursor: 'grab' }}>
                <div 
                  className="mermaid-container flex items-center justify-center p-8 min-h-[400px] w-full select-none"
                  dangerouslySetInnerHTML={{ __html: svg }} 
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Fullscreen Modal Popup Overlay */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-md p-8 animate-in fade-in duration-200">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Architecture Diagram Viewer</h3>
              <p className="text-xs text-slate-400">Full-scale rendering with scroll support</p>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-3 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-2xl border border-white/10 transition-all flex items-center space-x-2 text-xs font-bold shadow-lg"
            >
              <Minimize2 size={14} />
              <span>EXIT FULLSCREEN</span>
            </button>
          </header>

          <div className="flex-1 border border-white/5 rounded-3xl overflow-hidden bg-slate-900/30 relative">
            <TransformWrapper
              initialScale={1}
              minScale={0.1}
              maxScale={5}
              centerOnInit={true}
              wheel={{ step: 0.1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-4 left-4 z-10 flex space-x-2 bg-slate-950/80 p-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                    <button onClick={() => zoomIn()} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Zoom In"><ZoomIn size={16} /></button>
                    <button onClick={() => zoomOut()} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Zoom Out"><ZoomOut size={16} /></button>
                    <button onClick={() => resetTransform()} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Reset View"><Move size={16} /></button>
                  </div>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <div 
                      className="w-full h-full flex items-center justify-center p-12 [&>svg]:max-w-none [&>svg]:w-auto [&>svg]:h-auto"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function MermaidChartWrapper(props: MermaidProps) {
  return (
    <ErrorBoundary fallback={<div className="text-red-500 text-[11px] font-bold p-4 bg-red-500/5 border border-red-500/10 rounded-xl">⚠️ Schema Diagram rendering failed unexpectedly. Please check syntax.</div>}>
      <MermaidChart {...props} />
    </ErrorBoundary>
  );
}
