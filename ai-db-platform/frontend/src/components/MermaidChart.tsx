import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2 } from 'lucide-react';

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

      if (trimmed.includes('{')) {
        insideTable = true;
        return line;
      }
      if (trimmed.includes('}')) {
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
          const key = tokens.slice(2).join(' '); // e.g. PK, FK

          // Ensure type is valid alphanumeric or wrapped in double quotes
          let safeType = type;
          if (!/^[a-zA-Z0-9_]+$/.test(type)) {
            safeType = `"${type}"`;
          }

          // Ensure column name is safe alphanumeric snake_case
          const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');

          return `    ${safeType} ${safeColumn} ${key}`;
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

      {/* Inline Render with Maximize Action */}
      <div className="relative">
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all opacity-0 group-hover/mermaid:opacity-100 shadow-lg flex items-center justify-center"
          title="Fullscreen View"
        >
          <Maximize2 size={14} />
        </button>

        <div 
          className="mermaid-container flex justify-center bg-slate-950/20 p-8 rounded-2xl overflow-auto border border-white/5 shadow-inner min-h-[350px] w-full"
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      </div>

      {/* Fullscreen Modal Popup Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-md p-8 animate-in fade-in duration-200">
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

          <div 
            className="flex-1 bg-slate-900/30 border border-white/5 rounded-3xl overflow-auto p-12 flex items-center justify-center [&>svg]:max-w-none [&>svg]:w-auto [&>svg]:h-auto [&>svg]:scale-110"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </div>
  );
};

export default MermaidChart;
