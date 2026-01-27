'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react'
import { WelcomeBoardCanvas } from './WelcomeBoardCanvas'
import { WelcomeBoardControlPanel } from './WelcomeBoardControlPanel'
import { WelcomeBoardExport } from './WelcomeBoardExport'
import type { WelcomeBoardTemplate, UserEditData, TemplateConfig } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardEditorProps {
  template: WelcomeBoardTemplate
  onBack: () => void
}

export function WelcomeBoardEditor({ template, onBack }: WelcomeBoardEditorProps) {
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

  // 실제 적용할 스케일
  const scale = manualZoom ?? autoScale

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
  const handleReset = useCallback(() => {
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
  }, [template.config])

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900">
      {/* 좌측: 캔버스 미리보기 영역 */}
      <div className="flex-1 pr-[410px] overflow-hidden">
        <div className="h-full flex flex-col pt-14">
          {/* 헤더 */}
          <div className="px-8 pt-4 pb-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              목록으로
            </Button>
            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold">{template.name}</h2>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
            {/* 줌 컨트롤 */}
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
          </div>

          {/* 캔버스 컨테이너 */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 mx-8 mb-8 rounded-lg overflow-auto"
          >
            <div
              className="shadow-2xl rounded-lg overflow-hidden flex-shrink-0 m-4"
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
      <div className="fixed right-0 top-0 bottom-0 w-[410px] border-l bg-card overflow-y-auto">
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
          />

          {/* 내보내기 컨트롤 */}
          <WelcomeBoardExport
            template={template}
            userEditData={userEditData}
            canvasRef={canvasRef}
          />
        </div>
      </div>
    </div>
  )
}
