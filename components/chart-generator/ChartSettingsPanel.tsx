'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ChartSettings, 
  ChartType, 
  ChartTypeSettings,
  DEFAULT_CHART_TYPE_SETTINGS,
  COLOR_PRESETS, 
  ColorPresetKey 
} from '@/lib/chart-schemas'
import { Plus, X, Palette, RotateCcw, BarChart3, TrendingUp, PieChart, AreaChart, Tag, Save, FolderOpen, Trash2, AlertCircle, Check } from 'lucide-react'

import { ChartExportControls } from './ChartExportControls'

// 저장된 프리셋 타입
interface SavedChartPreset {
  id: string
  name: string
  createdAt: string
  chartType: ChartType
  settings: ChartSettings
  chartTypeSettings: ChartTypeSettings
}

// localStorage 키
const STORAGE_KEY = 'chart-generator-presets'

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
  valueLabelPosition: 'top',
  valueLabelOffset: 5,
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
  
  // 프리셋 저장/불러오기 관련 상태
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState<SavedChartPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // localStorage에서 저장된 프리셋 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSavedPresets(JSON.parse(stored))
      }
    } catch (error) {
      console.error('프리셋 불러오기 오류:', error)
    }
  }, [])

  // 프리셋 저장
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      alert('프리셋 이름을 입력해주세요.')
      return
    }

    const newPreset: SavedChartPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      createdAt: new Date().toISOString(),
      chartType,
      settings,
      chartTypeSettings,
    }

    const updatedPresets = [...savedPresets, newPreset]
    setSavedPresets(updatedPresets)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets))
      setSaveDialogOpen(false)
      setPresetName('')
      alert('설정이 저장되었습니다.')
    } catch (error) {
      console.error('프리셋 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }, [presetName, chartType, settings, chartTypeSettings, savedPresets])

  // 프리셋 불러오기
  const handleLoadPreset = useCallback((preset: SavedChartPreset) => {
    onSettingsChange(preset.settings)
    onChartTypeSettingsChange(preset.chartTypeSettings)
    setActivePresetId(preset.id)
  }, [onSettingsChange, onChartTypeSettingsChange])

  // 프리셋 삭제
  const handleDeletePreset = useCallback((presetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return

    const updatedPresets = savedPresets.filter(p => p.id !== presetId)
    setSavedPresets(updatedPresets)
    
    // 삭제된 프리셋이 활성 상태였다면 해제
    if (activePresetId === presetId) {
      setActivePresetId(null)
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets))
    } catch (error) {
      console.error('프리셋 삭제 오류:', error)
    }
  }, [savedPresets, activePresetId])

  // 활성 프리셋 이름 가져오기
  const activePresetName = useMemo(() => {
    if (!activePresetId) return null
    return savedPresets.find(p => p.id === activePresetId)?.name || null
  }, [activePresetId, savedPresets])

  // 차트 타입 아이콘
  const getChartTypeIcon = (type: ChartType) => {
    switch (type) {
      case 'bar': return <BarChart3 className="h-4 w-4" />
      case 'line': return <TrendingUp className="h-4 w-4" />
      case 'pie': return <PieChart className="h-4 w-4" />
      case 'area': return <AreaChart className="h-4 w-4" />
    }
  }

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
    setActivePresetId(null)
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
      {/* 헤더: 제목 + 저장/불러오기 버튼 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">차트 설정</h2>
        <div className="flex items-center gap-1">
          {/* 현재 활성 프리셋 이름 */}
          {activePresetName && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px] mr-1">
              {activePresetName}
            </span>
          )}
          {/* 저장 버튼 */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>설정 저장</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 불러오기 드롭다운 */}
          <DropdownMenu>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>저장된 설정 불러오기</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>저장된 설정</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedPresets.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  저장된 설정이 없습니다.
                </div>
              ) : (
                savedPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className={`flex items-center justify-between cursor-pointer ${
                      activePresetId === preset.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleLoadPreset(preset)}
                  >
                    <div className="flex items-center gap-2">
                      {activePresetId === preset.id ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        getChartTypeIcon(preset.chartType)
                      )}
                      <span className="truncate max-w-[150px]">{preset.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 저장 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>설정 저장</DialogTitle>
            <DialogDescription>
              현재 차트 설정을 저장합니다. 나중에 불러와서 재사용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">프리셋 이름</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="예: 보고서용 막대 그래프"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                설정은 현재 브라우저의 로컬 저장소에 저장됩니다. 
                다른 브라우저나 기기에서는 사용할 수 없으며, 
                시크릿 모드에서는 저장되지 않을 수 있습니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleSavePreset}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <Label className="text-sm font-medium">폰트 크기</Label>
        <div className="grid grid-cols-3 gap-2">
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

      {/* 값 레이블 설정 */}
      <div className="space-y-4">
        {/* <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <Label className="text-sm font-medium">값 레이블</Label>
        </div> */}
        
        {/* 값 레이블 표시 옵션 */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="showValueLabels"
            checked={settings.showValueLabels ?? false}
            onCheckedChange={(checked: boolean) => onSettingsChange({ ...settings, showValueLabels: checked })}
          />
          <Label htmlFor="showValueLabels" className="text-sm cursor-pointer">
            값 레이블 표시
          </Label>
        </div>

        {/* 막대, 선, 영역 그래프용 위치 및 거리 설정 */}
        {settings.showValueLabels && chartType !== 'pie' && (
          <div className="space-y-3 pl-6">
            {/* 위치 설정 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">위치</Label>
              <div className="flex gap-2">
                {[
                  { value: 'top', label: '상단' },
                  { value: 'insideTop', label: chartType === 'bar' ? '내부 상단' : '하단' },
                  { value: 'inside', label: chartType === 'bar' ? '내부 중앙' : '선 중앙' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={settings.valueLabelPosition === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => onSettingsChange({
                      ...settings,
                      valueLabelPosition: option.value as 'top' | 'insideTop' | 'inside'
                    })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 거리 설정 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">거리: {settings.valueLabelOffset ?? 5}px</Label>
              <input
                type="range"
                value={settings.valueLabelOffset ?? 5}
                onChange={(e) => onSettingsChange({ ...settings, valueLabelOffset: Number(e.target.value) })}
                min={-20}
                max={30}
                step={1}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}

        {/* 원형 그래프용 거리 설정 */}
        {settings.showValueLabels && chartType === 'pie' && (
          <div className="space-y-3 pl-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                거리: {chartTypeSettings.pie.labelDistance ?? 20}%
              </Label>
              <input
                type="range"
                value={chartTypeSettings.pie.labelDistance ?? 20}
                onChange={(e) => onChartTypeSettingsChange({
                  ...chartTypeSettings,
                  pie: { ...chartTypeSettings.pie, labelDistance: Number(e.target.value) }
                })}
                min={10}
                max={50}
                step={5}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}
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
