'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { ChartType, chartSchema } from '@/lib/chart-schemas'
import { useEffect } from 'react'

// 차트 타입별 기본 스키마 (데이터 입력용)
const dataPointSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  value: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    { message: '유효한 숫자를 입력해주세요.' }
  ),
})

const chartDataFormSchema = z.object({
  data: z.array(dataPointSchema).min(1, '최소 1개의 데이터가 필요합니다.'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
})

type ChartDataFormValues = z.infer<typeof chartDataFormSchema>

interface ChartDataFormProps {
  chartType: ChartType
  onChange: (data: Array<{ name: string; value: number }>) => void
  onXAxisLabelChange?: (label: string) => void
  onYAxisLabelChange?: (label: string) => void
}

export function ChartDataForm({ chartType, onChange, onXAxisLabelChange, onYAxisLabelChange }: ChartDataFormProps) {
  const form = useForm<ChartDataFormValues>({
    resolver: zodResolver(chartDataFormSchema),
    defaultValues: {
      data: [
        { name: '항목 1', value: '10' },
        { name: '항목 2', value: '20' },
        { name: '항목 3', value: '30' },
        { name: '항목 4', value: '40' },
      ],
      xAxisLabel: '',
      yAxisLabel: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'data',
  })

  // 폼 값 변경 시 부모 컴포넌트에 전달
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.data) {
        const parsedData = value.data
          .map((item) => ({
            name: item?.name || '',
            value: Number(item?.value) || 0,
          }))
          .filter((item) => item.name && !isNaN(item.value))
        
        if (parsedData.length > 0) {
          onChange(parsedData)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])
  
  // 초기 데이터가 변경되면 폼 업데이트 - 제거됨 (무한 루프 방지)

  const addRow = () => {
    append({ name: '', value: '' })
  }

  const removeRow = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">데이터 입력</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-1.5 items-start">
            <div className="flex-1 space-y-1">
              <Input
                {...form.register(`data.${index}.name`)}
                placeholder="항목명"
                className="text-sm h-9"
              />
              {form.formState.errors.data?.[index]?.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.data[index]?.name?.message}
                </p>
              )}
            </div>
            <div className="w-24 space-y-1">
              <Input
                {...form.register(`data.${index}.value`)}
                type="number"
                step="0.01"
                placeholder="값"
                className="text-sm h-9"
              />
              {form.formState.errors.data?.[index]?.value && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.data[index]?.value?.message}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => removeRow(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {chartType !== 'pie' && (
        <div className="space-y-2 pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">X축 레이블</Label>
              <Input
                {...form.register('xAxisLabel')}
                placeholder="X축 레이블 (선택사항)"
                className="text-sm"
                onChange={(e) => {
                  form.setValue('xAxisLabel', e.target.value)
                  onXAxisLabelChange?.(e.target.value)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Y축 레이블</Label>
              <Input
                {...form.register('yAxisLabel')}
                placeholder="Y축 레이블 (선택사항)"
                className="text-sm"
                onChange={(e) => {
                  form.setValue('yAxisLabel', e.target.value)
                  onYAxisLabelChange?.(e.target.value)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
