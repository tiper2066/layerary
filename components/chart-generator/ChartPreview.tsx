'use client'

import { useMemo, forwardRef } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import { ChartType, ChartSettings, ChartTypeSettings } from '@/lib/chart-schemas'
import { cn } from '@/lib/utils'

interface ChartPreviewProps {
  chartType: ChartType
  data: Array<{ name: string; value: number }>
  settings: ChartSettings
  chartTypeSettings: ChartTypeSettings
  xAxisLabel?: string
  yAxisLabel?: string
  title?: string
  className?: string
}

// 차트 색상 팔레트
const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ffbb28',
  '#ff8042',
]

export const ChartPreview = forwardRef<HTMLDivElement, ChartPreviewProps>(({
  chartType,
  data,
  settings,
  chartTypeSettings,
  xAxisLabel,
  yAxisLabel,
  title,
  className,
}, ref) => {

  // 데이터 변환 (Recharts 형식)
  const chartData = useMemo(() => {
    if (chartType === 'pie') {
      return data.map((item) => ({
        name: item.name,
        value: item.value,
      }))
    }
    return data.map((item) => ({
      name: item.name,
      value: item.value,
    }))
  }, [data, chartType])

  // 차트 렌더링
  const renderChart = () => {
    const labelFontSize = settings.labelFontSize || 12
    const valueFontSize = settings.valueFontSize || 12
    const valueLabelFontSize = settings.valueLabelFontSize || 12
    
    const commonProps = {
      width: settings.width,
      height: settings.height,
      data: chartData,
      margin: { top: 50, right: 50, left: 20, bottom: 20 },
    }

    switch (chartType) {
      case 'bar':
        // 막대 모양에 따른 radius 설정
        const barRadius = chartTypeSettings.bar.barRadius === 'rounded' 
          ? [8, 8, 8, 8] as [number, number, number, number]
          : chartTypeSettings.bar.barRadius === 'top-rounded' 
            ? [8, 8, 0, 0] as [number, number, number, number]
            : [0, 0, 0, 0] as [number, number, number, number]
        
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: labelFontSize }}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fontSize: labelFontSize } : undefined}
            />
            <YAxis
              tick={{ fontSize: valueFontSize }}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: valueFontSize } : undefined}
            />
            <Tooltip contentStyle={{ fontSize: valueFontSize }} />
            <Legend wrapperStyle={{ fontSize: labelFontSize }} />
            <Bar 
              dataKey="value" 
              fill={settings.colors[0] || COLORS[0]}
              barSize={chartTypeSettings.bar.barSize}
              radius={barRadius}
            >
              {settings.showValueLabels && (
                <LabelList 
                  dataKey="value" 
                  position={settings.valueLabelPosition || 'top'} 
                  offset={settings.valueLabelOffset ?? 5}
                  fontSize={valueLabelFontSize}
                  fill={
                    settings.valueLabelPosition === 'insideTop' || 
                    settings.valueLabelPosition === 'inside' 
                      ? '#ffffff' 
                      : '#333333'
                  }
                />
              )}
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={settings.colors[index % settings.colors.length] || COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: labelFontSize }}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fontSize: labelFontSize } : undefined}
            />
            <YAxis
              tick={{ fontSize: valueFontSize }}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: valueFontSize } : undefined}
            />
            <Tooltip contentStyle={{ fontSize: valueFontSize }} />
            <Legend wrapperStyle={{ fontSize: labelFontSize }} />
            <Line
              type={chartTypeSettings.line.lineType}
              dataKey="value"
              stroke={settings.colors[0] || COLORS[0]}
              strokeWidth={chartTypeSettings.line.strokeWidth}
              dot={chartTypeSettings.line.dotSize > 0 ? { r: chartTypeSettings.line.dotSize } : false}
            >
              {settings.showValueLabels && (
                <LabelList 
                  dataKey="value" 
                  position={settings.valueLabelPosition || 'top'} 
                  offset={settings.valueLabelOffset ?? 5}
                  fontSize={valueLabelFontSize} 
                />
              )}
            </Line>
          </LineChart>
        )

      case 'pie':
        const pieSize = Math.min(settings.width, settings.height)
        const outerRadius = Math.max(50, pieSize / 2 - 60)
        const isLabelInside = chartTypeSettings.pie.labelPosition === 'inside'
        const labelDistance = chartTypeSettings.pie.labelDistance ?? 20 // 반경 비율 (%)
        
        // 레이블 생성 함수
        const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius: or, value, percent }: {
          cx: number
          cy: number
          midAngle: number
          innerRadius: number
          outerRadius: number
          value: number
          percent: number
        }) => {
          if (!settings.showValueLabels) return null
          
          const RADIAN = Math.PI / 180
          // 내부/외부 위치에 따른 반지름 계산 (labelDistance 적용)
          const radius = isLabelInside 
            ? innerRadius + (or - innerRadius) * (labelDistance / 100) 
            : or * (1 + labelDistance / 100)
          const x = cx + radius * Math.cos(-midAngle * RADIAN)
          const y = cy + radius * Math.sin(-midAngle * RADIAN)
          
          const displayValue = chartTypeSettings.pie.labelType === 'percent' 
            ? `${(percent * 100).toFixed(0)}%` 
            : value
          
          return (
            <text 
              x={x} 
              y={y} 
              fill={isLabelInside ? '#fff' : '#333'}
              textAnchor={x > cx ? 'start' : 'end'} 
              dominantBaseline="central"
              fontSize={valueLabelFontSize}
            >
              {displayValue}
            </text>
          )
        }
        
        return (
          <PieChart width={settings.width} height={settings.height}>
            <Pie
              data={chartData}
              cx={settings.width / 2}
              cy={settings.height / 2}
              labelLine={settings.showValueLabels && !isLabelInside}
              label={settings.showValueLabels ? renderPieLabel : false}
              outerRadius={outerRadius}
              fill="#8884d8"
              dataKey="value"
              style={{ fontSize: valueLabelFontSize }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={settings.colors[index % settings.colors.length] || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: valueFontSize }} />
            <Legend wrapperStyle={{ fontSize: labelFontSize }} />
          </PieChart>
        )

      case 'area':
        const areaColor = settings.colors[0] || COLORS[0]
        const useGradient = chartTypeSettings.area.fillType === 'gradient'
        const gradientId = 'areaGradient'
        
        return (
          <AreaChart {...commonProps}>
            {useGradient && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            )}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: labelFontSize }}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fontSize: labelFontSize } : undefined}
            />
            <YAxis
              tick={{ fontSize: valueFontSize }}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: valueFontSize } : undefined}
            />
            <Tooltip contentStyle={{ fontSize: valueFontSize }} />
            <Legend wrapperStyle={{ fontSize: labelFontSize }} />
            <Area
              type={chartTypeSettings.area.lineType}
              dataKey="value"
              stroke={areaColor}
              strokeWidth={chartTypeSettings.area.strokeWidth}
              fill={useGradient ? `url(#${gradientId})` : areaColor}
              fillOpacity={useGradient ? 1 : 0.6}
            >
              {settings.showValueLabels && (
                <LabelList 
                  dataKey="value" 
                  position={settings.valueLabelPosition || 'top'} 
                  offset={settings.valueLabelOffset ?? 5}
                  fontSize={valueLabelFontSize} 
                />
              )}
            </Area>
          </AreaChart>
        )

      default:
        return null
    }
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border-2 border-dashed rounded-lg',
          className
        )}
        style={{ width: settings.width, height: settings.height }}
      >
        <p className="text-muted-foreground text-sm">데이터를 입력해주세요</p>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center bg-background rounded-lg border overflow-hidden', className)}
      style={{ width: settings.width, minHeight: settings.height }}
    >
      {title && (
        <div className="w-full px-4 py-2 border-b bg-muted/50">
          <h3 className="text-lg font-semibold text-center">{title}</h3>
        </div>
      )}
      <div className="w-full flex items-center justify-center" style={{ minHeight: settings.height }}>
        {renderChart()}
      </div>
    </div>
  )
})

ChartPreview.displayName = 'ChartPreview'
