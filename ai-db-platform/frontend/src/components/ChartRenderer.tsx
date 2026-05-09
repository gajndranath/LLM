import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ChartRendererProps {
  type: 'bar' | 'line' | 'pie' | 'area' | 'none';
  data: any[];
  xAxis?: string;
  yAxis?: string;
  label?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, xAxis, yAxis, label }) => {
  if (type === 'none' || !data || data.length === 0 || !xAxis || !yAxis) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
        No visualization recommended for this result set.
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey={xAxis} 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Bar dataKey={yAxis} fill="#3b82f6" radius={[4, 4, 0, 0]} name={label || yAxis} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey={xAxis} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
            <Legend verticalAlign="top" align="right" />
            <Line type="monotone" dataKey={yAxis} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name={label || yAxis} />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey={xAxis} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
            <Area type="monotone" dataKey={yAxis} stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} name={label || yAxis} />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={yAxis}
              nameKey={xAxis}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
            <Legend />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart() as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
