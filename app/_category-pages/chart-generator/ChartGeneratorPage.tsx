'use client'

import { useState, useRef, useCallback } from 'react'
import { ChartTypeSelector } from '@/components/chart-generator/ChartTypeSelector'
import { ChartDataForm } from '@/components/chart-generator/ChartDataForm'
import { ChartPreview } from '@/components/chart-generator/ChartPreview'
import { ChartSettingsPanel } from '@/components/chart-generator/ChartSettingsPanel'
import { ChartType, ChartSettings, ChartTypeSettings, DEFAULT_CHART_TYPE_SETTINGS } from '@/lib/chart-schemas'

export function ChartGeneratorPage() {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([
    { name: '항목 1', value: 10 },
    { name: '항목 2', value: 20 },
    { name: '항목 3', value: 30 },
    { name: '항목 4', value: 40 },
  ])
  const [settings, setSettings] = useState<ChartSettings>({
    width: 800,
    height: 400,
    colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'],
    backgroundColor: undefined,
    labelFontSize: 12,
    valueFontSize: 12,
    valueLabelFontSize: 12,
    highResolution: false,
    showValueLabels: false,
    valueLabelPosition: 'top',
    valueLabelOffset: 5,
  })
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [xAxisLabel, setXAxisLabel] = useState<string>('')
  const [yAxisLabel, setYAxisLabel] = useState<string>('')
  const [chartTypeSettings, setChartTypeSettings] = useState<ChartTypeSettings>(DEFAULT_CHART_TYPE_SETTINGS)
  
  const chartRef = useRef<HTMLDivElement>(null)

  const handleChartTypeChange = useCallback((type: ChartType) => {
    setChartType(type)
  }, [])

  const handleDataChange = useCallback((data: Array<{ name: string; value: number }>) => {
    setChartData(data)
  }, [])

  const handleSettingsChange = useCallback((newSettings: ChartSettings) => {
    setSettings(newSettings)
  }, [])

  const handleChartTypeSettingsChange = useCallback((newSettings: ChartTypeSettings) => {
    setChartTypeSettings(newSettings)
  }, [])

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900">
      {/* 좌측: 차트 생성 영역 */}
      <div className="flex-1 pr-[410px] overflow-y-auto">
        <div className="px-8 pt-16 pb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Chart Generator</h1>
            <p className="text-muted-foreground mt-2">
              차트 타입을 선택하고 데이터를 입력하여 차트를 생성하고 다운로드하세요.
            </p>
          </div>

          <div className="space-y-6">
            {/* 차트 타입 선택 */}
            <div className="bg-card border rounded-lg p-4">
              <ChartTypeSelector
                selectedType={chartType}
                onTypeChange={handleChartTypeChange}
              />
            </div>

            {/* 데이터 입력 폼 */}
            <div className="bg-card border rounded-lg p-4">
              <ChartDataForm
                chartType={chartType}
                onChange={handleDataChange}
                onXAxisLabelChange={setXAxisLabel}
                onYAxisLabelChange={setYAxisLabel}
              />
            </div>

            {/* 차트 프리뷰 */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex flex-col items-center overflow-x-auto">
                <ChartPreview
                  ref={chartRef}
                  chartType={chartType}
                  data={chartData}
                  settings={settings}
                  chartTypeSettings={chartTypeSettings}
                  xAxisLabel={xAxisLabel}
                  yAxisLabel={yAxisLabel}
                  title={title}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 설정 패널 */}
      <div className="fixed right-0 top-0 bottom-0">
        <ChartSettingsPanel
          settings={settings}
          chartType={chartType}
          chartTypeSettings={chartTypeSettings}
          data={chartData}
          title={title}
          description={description}
          chartRef={chartRef}
          onSettingsChange={handleSettingsChange}
          onChartTypeSettingsChange={handleChartTypeSettingsChange}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />
      </div>
    </div>
  )
}
