import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    primaryColor: '#3b82f6',
    lineColor: '#64748b',
    textColor: '#f1f5f9',
  }
});

interface MermaidProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (chart) {
      const renderChart = async () => {
        try {
          const { svg } = await mermaid.render(idRef.current, chart);
          setSvg(svg);
        } catch (error) {
          console.error("Mermaid Render Error:", error);
          setSvg('<div class="text-red-500 text-[10px]">Failed to render diagram. Check syntax.</div>');
        }
      };
      renderChart();
    }
  }, [chart]);

  if (!chart) return null;

  return (
    <div 
      className="mermaid-container flex justify-center bg-slate-900/50 p-6 rounded-2xl overflow-auto border border-white/5 shadow-inner min-h-[300px]"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default MermaidChart;
