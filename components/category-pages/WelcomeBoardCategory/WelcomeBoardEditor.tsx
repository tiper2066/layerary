'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
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
import { ArrowLeft, ZoomIn, ZoomOut, Save, FolderOpen, RotateCcw, Trash2, Check, Settings2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider'
import { WelcomeBoardCanvas } from './WelcomeBoardCanvas'
import { WelcomeBoardControlPanel } from './WelcomeBoardControlPanel'
import { WelcomeBoardExport } from './WelcomeBoardExport'
import type { 
  WelcomeBoardTemplate, 
  UserEditData, 
  TemplateConfig,
  SavedWelcomeBoardPreset 
} from '@/lib/welcomeboard-schemas'
import { presetStorageUtils } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardEditorProps {
  template: WelcomeBoardTemplate
  onBack: () => void
}

export function WelcomeBoardEditor({ template, onBack }: WelcomeBoardEditorProps) {
  const { confirm } = useConfirmDialog()
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [autoScale, setAutoScale] = useState(1) // 자동 계산된 스케일
  const [manualZoom, setManualZoom] = useState<number | null>(null) // 수동 줌 (null이면 자동)
  const [activeElementId, setActiveElementId] = useState<string | null>(null)
  const [userEditData, setUserEditData] = useState<UserEditData>(() => {
    // 초기값 설정 - 템플릿 config의 기본값 사용
    const config = template.config as TemplateConfig
    const initialTextValues: Record<string, string> = {}
    config.textElements.forEach((element) => {
      initialTextValues[element.id] = element.defaultValue
    })
    return {
      textValues: initialTextValues,
      logoUrl: null,
    }
  })

  // 프리셋 저장/불러오기 상태
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState<SavedWelcomeBoardPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // 실제 적용할 스케일
  const scale = manualZoom ?? autoScale

  // 현재 템플릿 설정 (userEditData 기반)
  const currentConfig = useMemo((): TemplateConfig => {
    const config = template.config as TemplateConfig
    return {
      textElements: config.textElements.map(element => ({
        ...element,
        defaultValue: userEditData.textValues[element.id] || element.defaultValue,
      })),
      logoArea: config.logoArea,
    }
  }, [template.config, userEditData.textValues])

  // 현재 템플릿의 프리셋만 필터링
  const currentTemplatePresets = useMemo(() => {
    return savedPresets.filter(preset => preset.templateId === template.id)
  }, [savedPresets, template.id])

  // localStorage에서 저장된 프리셋 불러오기
  useEffect(() => {
    const presets = presetStorageUtils.getAllPresets()
    setSavedPresets(presets)
  }, [])

  // 자동 저장 (편집 시)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      presetStorageUtils.saveAutosave(template.id, currentConfig)
    }, 1000) // 1초 디바운스

    return () => clearTimeout(timeoutId)
  }, [template.id, currentConfig])

  // 프리셋 저장
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      toast.error('프리셋 이름을 입력해주세요.')
      return
    }

    const newPreset: SavedWelcomeBoardPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      createdAt: new Date().toISOString(),
      templateId: template.id,
      templateName: template.name, // 템플릿 이름 추가
      config: currentConfig,
    }

    const success = presetStorageUtils.savePreset(newPreset)
    
    if (success) {
      setSavedPresets(prev => [...prev, newPreset])
      setActivePresetId(newPreset.id)
      setSaveDialogOpen(false)
      setPresetName('')
      toast.success('설정이 저장되었습니다.')
    } else {
      toast.error('저장 중 오류가 발생했습니다.')
    }
  }, [presetName, template.id, template.name, currentConfig])

  // 프리셋 불러오기
  const handleLoadPreset = useCallback((preset: SavedWelcomeBoardPreset) => {
    const newTextValues: Record<string, string> = {}
    preset.config.textElements.forEach(element => {
      newTextValues[element.id] = element.defaultValue
    })
    
    setUserEditData(prev => ({
      ...prev,
      textValues: newTextValues,
    }))
    setActivePresetId(preset.id)
  }, [])

  // 프리셋 삭제
  const handleDeletePreset = useCallback(async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!(await confirm('이 프리셋을 삭제하시겠습니까?'))) return

    const success = presetStorageUtils.deletePreset(presetId)
    
    if (success) {
      setSavedPresets(prev => prev.filter(p => p.id !== presetId))
      if (activePresetId === presetId) {
        setActivePresetId(null)
      }
    }
  }, [activePresetId, confirm])

  // 활성 프리셋 이름 가져오기
  const activePresetName = useMemo(() => {
    if (!activePresetId) return null
    return savedPresets.find(p => p.id === activePresetId)?.name || null
  }, [activePresetId, savedPresets])

  // 컨테이너 크기에 맞게 캔버스 스케일 조정
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth - 48 // 패딩 고려
    const containerHeight = containerRef.current.offsetHeight - 48

    const scaleX = containerWidth / template.width
    const scaleY = containerHeight / template.height

    // 더 작은 스케일 사용하여 캔버스가 컨테이너에 맞도록
    const newScale = Math.min(scaleX, scaleY, 1) // 최대 1배
    setAutoScale(newScale)
  }, [template.width, template.height])

  // 리사이즈 핸들러
  useEffect(() => {
    calculateScale()

    const handleResize = () => {
      calculateScale()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculateScale])

  // 줌 핸들러
  const handleZoomIn = useCallback(() => {
    const current = manualZoom ?? autoScale
    setManualZoom(Math.min(current + 0.1, 1.5))
  }, [manualZoom, autoScale])

  const handleZoomOut = useCallback(() => {
    const current = manualZoom ?? autoScale
    setManualZoom(Math.max(current - 0.1, 0.1))
  }, [manualZoom, autoScale])

  const handleZoomReset = useCallback(() => {
    setManualZoom(1) // 100%로 설정
  }, [])

  // 텍스트 값 변경 핸들러
  const handleTextChange = useCallback((elementId: string, value: string) => {
    setUserEditData((prev) => ({
      ...prev,
      textValues: {
        ...prev.textValues,
        [elementId]: value,
      },
    }))
  }, [])

  // 로고 URL 변경 핸들러
  const handleLogoChange = useCallback((logoUrl: string | null) => {
    setUserEditData((prev) => ({
      ...prev,
      logoUrl,
    }))
  }, [])

  // 요소 클릭 핸들러
  const handleElementClick = useCallback((elementId: string) => {
    setActiveElementId(elementId)
  }, [])

  // 초기화 핸들러
  const handleReset = useCallback(async () => {
    if (!(await confirm('템플릿 기본값으로 초기화하시겠습니까?'))) return
    
    const config = template.config as TemplateConfig
    const initialTextValues: Record<string, string> = {}
    config.textElements.forEach((element) => {
      initialTextValues[element.id] = element.defaultValue
    })
    setUserEditData({
      textValues: initialTextValues,
      logoUrl: null,
    })
    setActiveElementId(null)
    setActivePresetId(null)
  }, [template.config, confirm])

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900 z-50">
      {/* 좌측: 캔버스 미리보기 영역 */}
      <div className="flex-1 pr-[410px] overflow-hidden">
        <div className="h-full flex flex-col pt-8">
          {/* 헤더 */}
          <div className="px-8 pt-4 pb-4 flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>목록으로</TooltipContent>
            </Tooltip>
            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold">{template.name}</h2>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
            {/* 줌 컨트롤 */}
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>축소</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleZoomReset}>
                      {Math.round(scale * 100)}%
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>원본 크기</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>확대</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* 캔버스 컨테이너 */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center mx-8 mb-8 rounded-lg overflow-auto"
          >
            <div
              className="shadow-lg rounded-lg overflow-hidden flex-shrink-0 m-4"
              style={{
                width: template.width * scale,
                height: template.height * scale,
              }}
            >
              <WelcomeBoardCanvas
                ref={canvasRef}
                template={template}
                userEditData={userEditData}
                scale={scale}
                showEditHighlight={true}
                activeElementId={activeElementId}
                onElementClick={handleElementClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 컨트롤 패널 */}
      <div className="fixed right-0 top-0 bottom-0 w-[410px] border-l bg-card overflow-y-auto z-50">
        <div className="p-6 space-y-6">
          {/* 텍스트 및 로고 편집 */}
          <WelcomeBoardControlPanel
            template={template}
            userEditData={userEditData}
            activeElementId={activeElementId}
            onTextChange={handleTextChange}
            onLogoChange={handleLogoChange}
            onElementSelect={setActiveElementId}
            onReset={handleReset}
            // 프리셋 관련 props
            activePresetName={activePresetName}
            currentTemplatePresets={currentTemplatePresets}
            activePresetId={activePresetId}
            onSavePreset={() => setSaveDialogOpen(true)}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            onManagePresets={() => setManageDialogOpen(true)}
          />

          {/* 내보내기 컨트롤 */}
          <WelcomeBoardExport
            template={template}
            userEditData={userEditData}
            canvasRef={canvasRef}
          />
        </div>
      </div>

      {/* 저장 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>설정 저장</DialogTitle>
            <DialogDescription>
              현재 편집 설정을 저장합니다. 나중에 불러와서 재사용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">프리셋 이름</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="예: 파트너사 방문 템플릿"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePreset()
                  }
                }}
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
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSavePreset}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 설정 관리 다이얼로그 */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>저장된 설정 관리</DialogTitle>
            <DialogDescription>
              모든 템플릿의 저장된 설정을 관리할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {savedPresets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                저장된 설정이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 템플릿별로 그룹화 */}
                {Object.entries(
                  savedPresets.reduce((acc, preset) => {
                    if (!acc[preset.templateId]) {
                      acc[preset.templateId] = []
                    }
                    acc[preset.templateId].push(preset)
                    return acc
                  }, {} as Record<string, SavedWelcomeBoardPreset[]>)
                ).map(([templateId, presets]) => (
                  <div key={templateId} className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {presets[0]?.templateName || `템플릿 ID: ${templateId}`}
                      <span className="text-xs text-muted-foreground">
                        ({presets.length}개)
                      </span>
                    </h4>
                    <div className="space-y-1 pl-4">
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium truncate">{preset.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(preset.createdAt).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={async () => {
                              if (await confirm('이 프리셋을 삭제하시겠습니까?')) {
                                const success = presetStorageUtils.deletePreset(preset.id)
                                if (success) {
                                  setSavedPresets(prev => prev.filter(p => p.id !== preset.id))
                                  if (activePresetId === preset.id) {
                                    setActivePresetId(null)
                                  }
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setManageDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
