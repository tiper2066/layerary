'use client'

import { ChartType } from '@/lib/chart-schemas'
import { Button } from '@/components/ui/button'
import { BarChart3, LineChart, PieChart, AreaChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartTypeSelectorProps {
  selectedType: ChartType
  onTypeChange: (type: ChartType) => void
}

const chartTypes: Array<{
  type: ChartType
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { type: 'bar', label: '막대 그래프', icon: BarChart3 },
  { type: 'line', label: '선 그래프', icon: LineChart },
  { type: 'pie', label: '원형 그래프', icon: PieChart },
  { type: 'area', label: '영역 그래프', icon: AreaChart },
]

export function ChartTypeSelector({ selectedType, onTypeChange }: ChartTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">차트 타입</label>
      <div className="grid grid-cols-4 gap-2">
        {chartTypes.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            type="button"
            variant={selectedType === type ? 'default' : 'outline'}
            className={cn(
              'h-auto flex items-center gap-2 py-3 [&_svg]:size-auto',
              selectedType === type && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onTypeChange(type)}
          >
            <Icon className="h-8 w-8" />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
