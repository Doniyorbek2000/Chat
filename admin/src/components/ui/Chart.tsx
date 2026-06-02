'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

const tooltipStyle = {
  backgroundColor: '#1e1e2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.5rem',
  color: '#f8f8f8',
  fontSize: '0.75rem',
}

interface ChartWrapperProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  loading?: boolean
  height?: number
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  actions,
  loading = false,
  height = 300,
}: ChartWrapperProps) {
  return (
    <div className={cn('card', className)}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          {subtitle && <p className="text-dark-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {loading ? (
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full bg-white/5 rounded-lg" />
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

interface LineChartProps {
  data: Record<string, unknown>[]
  lines: { key: string; label: string; color?: string }[]
  xKey: string
  loading?: boolean
}

export function VoxoLineChart({ data, lines, xKey, loading = false }: LineChartProps) {
  return (
    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis
        dataKey={xKey}
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
      <Legend
        wrapperStyle={{ fontSize: '12px', color: '#737373', paddingTop: '16px' }}
      />
      {lines.map((line, i) => (
        <Line
          key={line.key}
          type="monotone"
          dataKey={line.key}
          name={line.label}
          stroke={line.color || COLORS[i % COLORS.length]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      ))}
    </LineChart>
  )
}

interface AreaChartProps {
  data: Record<string, unknown>[]
  areas: { key: string; label: string; color?: string }[]
  xKey: string
}

export function VoxoAreaChart({ data, areas, xKey }: AreaChartProps) {
  return (
    <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
      <defs>
        {areas.map((area, i) => {
          const color = area.color || COLORS[i % COLORS.length]
          return (
            <linearGradient key={area.key} id={`gradient-${area.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          )
        })}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis
        dataKey={xKey}
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
      <Legend wrapperStyle={{ fontSize: '12px', color: '#737373', paddingTop: '16px' }} />
      {areas.map((area, i) => {
        const color = area.color || COLORS[i % COLORS.length]
        return (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.label}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${area.key})`}
          />
        )
      })}
    </AreaChart>
  )
}

interface BarChartProps {
  data: Record<string, unknown>[]
  bars: { key: string; label: string; color?: string }[]
  xKey: string
}

export function VoxoBarChart({ data, bars, xKey }: BarChartProps) {
  return (
    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis
        dataKey={xKey}
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: '#737373', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
      <Legend wrapperStyle={{ fontSize: '12px', color: '#737373', paddingTop: '16px' }} />
      {bars.map((bar, i) => (
        <Bar
          key={bar.key}
          dataKey={bar.key}
          name={bar.label}
          fill={bar.color || COLORS[i % COLORS.length]}
          radius={[4, 4, 0, 0]}
        />
      ))}
    </BarChart>
  )
}

interface PieChartProps {
  data: { name: string; value: number; color?: string }[]
  innerRadius?: number
  outerRadius?: number
}

export function VoxoPieChart({ data, innerRadius = 60, outerRadius = 90 }: PieChartProps) {
  return (
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        paddingAngle={3}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      <Legend
        wrapperStyle={{ fontSize: '12px', color: '#737373', paddingTop: '8px' }}
        formatter={(value) => <span className="text-dark-200">{value}</span>}
      />
    </PieChart>
  )
}
