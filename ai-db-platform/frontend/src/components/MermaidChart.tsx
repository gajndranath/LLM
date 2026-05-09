import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

interface MermaidProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="mermaid flex justify-center bg-white/2 p-6 rounded-2xl overflow-auto" ref={ref}>
      {chart}
    </div>
  );
};

export default MermaidChart;
