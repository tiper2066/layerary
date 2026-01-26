'use client'

import { useState, useCallback, useMemo } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ChartSettings, 
  ChartType, 
  ChartTypeSettings,
  DEFAULT_CHART_TYPE_SETTINGS,
  COLOR_PRESETS, 
  ColorPresetKey 
} from '@/lib/chart-schemas'
import { Plus, X, Palette, RotateCcw, BarChart3, TrendingUp, PieChart, AreaChart } from 'lucide-react'

import { ChartExportControls } from './ChartExportControls'

// 기본 설정값
const DEFAULT_SETTINGS: ChartSettings = {
  width: 800,
  height: 400,
  colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'],
  backgroundColor: undefined,
  labelFontSize: 12,
  valueFontSize: 12,
  valueLabelFontSize: 12,
  highResolution: false,
  showValueLabels: false,
}

interface ChartSettingsPanelProps {
  settings: ChartSettings
  chartType: ChartType
  chartTypeSettings: ChartTypeSettings
  data: Array<{ name: string; value: number }>
  title?: string
  description?: string
  chartRef: React.RefObject<HTMLDivElement>
  onSettingsChange: (settings: ChartSettings) => void
  onChartTypeSettingsChange: (settings: ChartTypeSettings) => void
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
}

export function ChartSettingsPanel({
  settings,
  chartType,
  chartTypeSettings,
  data,
  title,
  description,
  chartRef,
  onSettingsChange,
  onChartTypeSettingsChange,
  onTitleChange,
  onDescriptionChange,
}: ChartSettingsPanelProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null)
  const [hoveredColorIndex, setHoveredColorIndex] = useState<number | null>(null)

  // 현재 선택된 프리셋 감지
  const activePreset = useMemo(() => {
    for (const key of Object.keys(COLOR_PRESETS) as ColorPresetKey[]) {
      const presetColors = COLOR_PRESETS[key].colors
      if (
        settings.colors.length === presetColors.length &&
        settings.colors.every((color, idx) => color.toLowerCase() === presetColors[idx].toLowerCase())
      ) {
        return key
      }
    }
    return null
  }, [settings.colors])

  // 설정 초기화 핸들러
  const handleReset = useCallback(() => {
    onSettingsChange(DEFAULT_SETTINGS)
    onChartTypeSettingsChange(DEFAULT_CHART_TYPE_SETTINGS)
    onTitleChange('')
    onDescriptionChange('')
  }, [onSettingsChange, onChartTypeSettingsChange, onTitleChange, onDescriptionChange])

  // 너비 변경 핸들러
  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value)
    onSettingsChange({ ...settings, width: newWidth })
  }, [settings, onSettingsChange])

  // 높이 변경 핸들러
  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = Number(e.target.value)
    onSettingsChange({ ...settings, height: newHeight })
  }, [settings, onSettingsChange])

  // 항목명 폰트 크기 변경 핸들러
  const handleLabelFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value)
    onSettingsChange({ ...settings, labelFontSize: newSize })
  }, [settings, onSettingsChange])

  // 값 폰트 크기 변경 핸들러
  const handleValueFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value)
    onSettingsChange({ ...settings, valueFontSize: newSize })
  }, [settings, onSettingsChange])

  // 값 레이블 폰트 크기 변경 핸들러
  const handleValueLabelFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value)
    onSettingsChange({ ...settings, valueLabelFontSize: newSize })
  }, [settings, onSettingsChange])

  // 색상 프리셋 적용 핸들러
  const handlePresetChange = useCallback((presetKey: ColorPresetKey) => {
    const preset = COLOR_PRESETS[presetKey]
    onSettingsChange({ ...settings, colors: [...preset.colors] })
  }, [settings, onSettingsChange])

  const handleColorChange = (index: number, color: string) => {
    // 색상이 실제로 변경되었을 때만 업데이트
    if (settings.colors[index] !== color) {
      const newColors = [...settings.colors]
      newColors[index] = color
      onSettingsChange({ ...settings, colors: newColors })
    }
  }

  const addColor = () => {
    const newColors = [...settings.colors, '#8884d8']
    onSettingsChange({ ...settings, colors: newColors })
  }

  const removeColor = (index: number) => {
    if (settings.colors.length > 1) {
      const newColors = settings.colors.filter((_, i) => i !== index)
      onSettingsChange({ ...settings, colors: newColors })
    }
  }

  return (
    <div className="w-[410px] h-full bg-background border-l overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">차트 설정</h2>
      </div>

      {/* 제목 및 설명 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            value={title || ''}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="차트 제목 (선택사항)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            value={description || ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="차트 설명 (선택사항)"
            rows={3}
          />
        </div>
      </div>

      {/* 크기 설정 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">차트 크기</Label>
          {/* 고해상도 출력 옵션 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="highResolution"
              checked={settings.highResolution ?? false}
              onCheckedChange={(checked: boolean) => onSettingsChange({ ...settings, highResolution: checked })}
            />
            <Label htmlFor="highResolution" className="text-xs text-muted-foreground cursor-pointer">
              고해상도 출력 (2x)
            </Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">너비: {settings.width}px</Label>
            <input
              type="range"
              value={settings.width}
              onChange={handleWidthChange}
              min={300}
              max={2000}
              step={10}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">높이: {settings.height}px</Label>
            <input
              type="range"
              value={settings.height}
              onChange={handleHeightChange}
              min={200}
              max={2000}
              step={10}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* 폰트 크기 설정 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">폰트 크기</Label>
          {/* 값 레이블 표시 옵션 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="showValueLabels"
              checked={settings.showValueLabels ?? false}
              onCheckedChange={(checked: boolean) => onSettingsChange({ ...settings, showValueLabels: checked })}
            />
            <Label htmlFor="showValueLabels" className="text-xs text-muted-foreground cursor-pointer">
              값 레이블 표시
            </Label>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pb-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">항목명: {settings.labelFontSize || 12}px</Label>
            <input
              type="range"
              value={settings.labelFontSize || 12}
              onChange={handleLabelFontSizeChange}
              min={8}
              max={24}
              step={1}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">값: {settings.valueFontSize || 12}px</Label>
            <input
              type="range"
              value={settings.valueFontSize || 12}
              onChange={handleValueFontSizeChange}
              min={8}
              max={24}
              step={1}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">레이블: {settings.valueLabelFontSize || 12}px</Label>
            <input
              type="range"
              value={settings.valueLabelFontSize || 12}
              onChange={handleValueLabelFontSizeChange}
              min={8}
              max={24}
              step={1}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* 차트 타입별 개별 설정 */}
      <div className="space-y-4">
        {/* 막대 그래프 설정 */}
        {chartType === 'bar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <Label className="text-sm font-medium">막대 그래프 설정</Label>
            </div>
            
            <div className="space-y-3">
              {/* 막대 너비 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">막대 너비: {chartTypeSettings.bar.barSize}px</Label>
                <input
                  type="range"
                  value={chartTypeSettings.bar.barSize}
                  onChange={(e) => onChartTypeSettingsChange({
                    ...chartTypeSettings,
                    bar: { ...chartTypeSettings.bar, barSize: Number(e.target.value) }
                  })}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              
              {/* 막대 모양 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">막대 모양</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'square', label: '직각' },
                    { value: 'rounded', label: '둥근 모서리' },
                    { value: 'top-rounded', label: '상단만 둥근' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.bar.barRadius === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        bar: { ...chartTypeSettings.bar, barRadius: option.value as 'square' | 'rounded' | 'top-rounded' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 선 그래프 설정 */}
        {chartType === 'line' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <Label className="text-sm font-medium">선 그래프 설정</Label>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {/* 선 두께 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">선 두께: {chartTypeSettings.line.strokeWidth}px</Label>
                  <input
                    type="range"
                    value={chartTypeSettings.line.strokeWidth}
                    onChange={(e) => onChartTypeSettingsChange({
                      ...chartTypeSettings,
                      line: { ...chartTypeSettings.line, strokeWidth: Number(e.target.value) }
                    })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                
                {/* Dot 크기 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">점(Dot) 크기: {chartTypeSettings.line.dotSize}px</Label>
                  <input
                    type="range"
                    value={chartTypeSettings.line.dotSize}
                    onChange={(e) => onChartTypeSettingsChange({
                      ...chartTypeSettings,
                      line: { ...chartTypeSettings.line, dotSize: Number(e.target.value) }
                    })}
                    min={0}
                    max={15}
                    step={1}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
              
              {/* 선 모양 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">선 모양</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'monotone', label: '곡선' },
                    { value: 'linear', label: '직선' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.line.lineType === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        line: { ...chartTypeSettings.line, lineType: option.value as 'monotone' | 'linear' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 원형 그래프 설정 */}
        {chartType === 'pie' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <Label className="text-sm font-medium">원형 그래프 설정</Label>
            </div>
            
            <div className="space-y-3">
              {/* 레이블 위치 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">레이블 위치</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'outside', label: '외부' },
                    { value: 'inside', label: '내부' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.pie.labelPosition === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        pie: { ...chartTypeSettings.pie, labelPosition: option.value as 'outside' | 'inside' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* 레이블 표시 방식 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">레이블 표시 방식</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'value', label: '실제 값' },
                    { value: 'percent', label: '퍼센트' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.pie.labelType === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        pie: { ...chartTypeSettings.pie, labelType: option.value as 'value' | 'percent' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 영역 그래프 설정 */}
        {chartType === 'area' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AreaChart className="h-4 w-4" />
              <Label className="text-sm font-medium">영역 그래프 설정</Label>
            </div>
            
            <div className="space-y-3">
              {/* 선 두께 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">상단 선 두께: {chartTypeSettings.area.strokeWidth}px</Label>
                <input
                  type="range"
                  value={chartTypeSettings.area.strokeWidth}
                  onChange={(e) => onChartTypeSettingsChange({
                    ...chartTypeSettings,
                    area: { ...chartTypeSettings.area, strokeWidth: Number(e.target.value) }
                  })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              
              {/* 선 모양 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">선 모양</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'monotone', label: '곡선' },
                    { value: 'linear', label: '직선' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.area.lineType === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        area: { ...chartTypeSettings.area, lineType: option.value as 'monotone' | 'linear' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* 영역 색상 타입 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">영역 색상 타입</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'solid', label: '단일색상' },
                    { value: 'gradient', label: '투명 그라디언트' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={chartTypeSettings.area.fillType === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onChartTypeSettingsChange({
                        ...chartTypeSettings,
                        area: { ...chartTypeSettings.area, fillType: option.value as 'solid' | 'gradient' }
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 색상 프리셋 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <Label className="text-sm font-medium">색상 프리셋</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(COLOR_PRESETS) as ColorPresetKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={activePreset === key ? 'default' : 'outline'}
              size="sm"
              className={`h-auto py-2 flex-col gap-1 ${
                activePreset === key ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onClick={() => handlePresetChange(key)}
            >
              <span className="text-xs font-medium">{COLOR_PRESETS[key].name}</span>
              <div className="flex gap-0.5">
                {COLOR_PRESETS[key].colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-sm border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* 색상 설정 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">개별 색상</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addColor}
            className="h-8"
          >
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>

        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap gap-2">
            {settings.colors.map((color, index) => (
              <div
                key={index}
                className="relative"
                onMouseEnter={() => setHoveredColorIndex(index)}
                onMouseLeave={() => setHoveredColorIndex(null)}
              >
                <Popover
                  open={colorPickerOpen === index}
                  onOpenChange={(open) => setColorPickerOpen(open ? index : null)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-[45px] h-[45px] rounded-lg border-2 border-border hover:border-primary/50 transition-all cursor-pointer"
                          style={{ backgroundColor: color }}
                          aria-label={`색상 선택: ${color}`}
                        />
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-mono text-xs">{color.toUpperCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-auto p-3">
                    <HexColorPicker
                      color={color}
                      onChange={(newColor) => handleColorChange(index, newColor)}
                    />
                  </PopoverContent>
                </Popover>
                
                {/* 삭제 버튼 - hover 시에만 표시 */}
                {hoveredColorIndex === index && settings.colors.length > 1 && (
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeColor(index)
                    }}
                    aria-label="색상 삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* 설정 초기화 */}
      <div className="pt-2 pb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          설정 초기화
        </Button>
      </div>

      {/* 내보내기 컨트롤 */}
      <ChartExportControls
        chartRef={chartRef}
        settings={settings}
        chartType={chartType}
        data={data}
        title={title}
        description={description}
      />
    </div>
  )
}
