'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowLeft, Save, Loader2, Settings2, ZoomIn, ZoomOut, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react'
import { toast } from 'sonner'
import { DiagramToolbar } from '@/components/category-pages/DiagramCategory/DiagramToolbar'
import { DiagramPropertyPanel } from '@/components/category-pages/DiagramCategory/DiagramPropertyPanel'
import { DiagramExportMenu } from '@/components/category-pages/DiagramCategory/DiagramExportMenu'
import { Shape, generateThumbnailDataUrl, getShapeBounds, type DiagramTool } from '@/lib/diagram-utils'
import Konva from 'konva'
import { useTheme } from 'next-themes'

// Konva는 SSR을 지원하지 않으므로 동적 임포트 필수
const DiagramCanvas = dynamic(
  () => import('@/components/category-pages/DiagramCategory/DiagramCanvas'),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> }
)

interface DiagramEditorPageProps {
  diagramId?: string
}

export function DiagramEditorPage({ diagramId }: DiagramEditorPageProps) {
  const router = useRouter()
  const { theme } = useTheme()
  
  const [title, setTitle] = useState('제목 없는 다이어그램')
  const [description, setDescription] = useState('')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([]) // 다중 선택
  const [tool, setTool] = useState<DiagramTool>('select')
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
  const [tempCanvasSize, setTempCanvasSize] = useState({ width: 1920, height: 1080 })
  const [zoom, setZoom] = useState(0.5) // 50% 줌
  const [loading, setLoading] = useState(!!diagramId)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  const stageRef = useRef<Konva.Stage | null>(null)

  // V 키: 선택 툴로 전환
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return
      const target = e.target as HTMLElement
      if (target?.closest('input') || target?.closest('textarea') || target?.getAttribute('contenteditable') === 'true') return
      e.preventDefault()
      setTool('select')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 기존 다이어그램 불러오기
  useEffect(() => {
    if (!diagramId) return

    const fetchDiagram = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/diagrams/${diagramId}`)
        
        if (!response.ok) {
          throw new Error('다이어그램을 불러오는데 실패했습니다.')
        }

        const data = await response.json()
        setTitle(data.diagram.title)
        setDescription(data.diagram.description || '')
        setShapes(data.diagram.canvasData)
        // 캔버스 크기도 불러오기
        if (data.diagram.width && data.diagram.height) {
          setCanvasSize({ width: data.diagram.width, height: data.diagram.height })
          setTempCanvasSize({ width: data.diagram.width, height: data.diagram.height })
        }
      } catch (error) {
        console.error('Error fetching diagram:', error)
        toast.error('다이어그램을 불러오는데 실패했습니다.')
        router.push('/diagram')
      } finally {
        setLoading(false)
      }
    }

    fetchDiagram()
  }, [diagramId, router])

  // 저장
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)

      // 썸네일 생성
      let thumbnailDataUrl: string | undefined
      if (stageRef.current) {
        thumbnailDataUrl = generateThumbnailDataUrl(stageRef.current)
      }

      const diagramData = {
        title,
        description,
        canvasData: shapes,
        width: canvasSize.width,
        height: canvasSize.height,
        thumbnailDataUrl,
      }

      if (diagramId) {
        // 수정
        const response = await fetch(`/api/diagrams/${diagramId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diagramData),
        })

        if (!response.ok) {
          throw new Error('저장에 실패했습니다.')
        }

        toast.success('다이어그램이 저장되었습니다.')
      } else {
        // 생성
        const response = await fetch('/api/diagrams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diagramData),
        })

        if (!response.ok) {
          throw new Error('저장에 실패했습니다.')
        }

        const data = await response.json()
        toast.success('다이어그램이 저장되었습니다.')
        router.push(`/diagram/${data.diagram.id}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 선택된 도형 업데이트
  const handleShapeUpdate = useCallback((updatedShape: Partial<Shape> | null) => {
    if (!selectedId) return

    if (updatedShape === null) {
      // 삭제
      setShapes((prev) => prev.filter((s) => s.id !== selectedId))
      setSelectedId(null)
    } else {
      // 업데이트
      setShapes((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, ...updatedShape } : s))
      )
    }
  }, [selectedId])

  // 도형 선택 핸들러 (Shift 다중 선택 지원)
  const handleSelectShape = useCallback((id: string | null, addToSelection: boolean = false) => {
    if (id === null) {
      setSelectedId(null)
      setSelectedIds([])
      return
    }

    if (addToSelection) {
      // Shift 키: 다중 선택
      setSelectedIds(prev => {
        // 기존 단일 선택도 포함
        const currentIds = prev.length > 0 ? prev : selectedId ? [selectedId] : []
        
        if (currentIds.includes(id)) {
          // 이미 선택됨 → 제거
          const newIds = currentIds.filter(i => i !== id)
          if (newIds.length === 0) {
            setSelectedId(null)
          } else if (newIds.length === 1) {
            setSelectedId(newIds[0])
          }
          return newIds
        } else {
          // 추가
          setSelectedId(null) // 다중 선택 시 단일 선택 초기화
          return [...currentIds, id]
        }
      })
    } else {
      // 일반 클릭: 단일 선택
      setSelectedId(id)
      setSelectedIds([])
    }
  }, [selectedId])

  // 다중 선택 설정
  const handleSelectMultiple = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      setSelectedId(null)
      setSelectedIds([])
    } else if (ids.length === 1) {
      setSelectedId(ids[0])
      setSelectedIds([])
    } else {
      setSelectedId(null)
      setSelectedIds(ids)
    }
  }, [])

  // 레이어 순서 변경
  const handleLayerChange = useCallback((direction: 'front' | 'forward' | 'backward' | 'back') => {
    if (!selectedId) return

    setShapes((prev) => {
      const index = prev.findIndex((s) => s.id === selectedId)
      if (index === -1) return prev

      const newShapes = [...prev]
      const [shape] = newShapes.splice(index, 1)

      if (direction === 'front') {
        // 맨 앞으로 (배열 끝으로)
        newShapes.push(shape)
      } else if (direction === 'forward') {
        // 앞으로 (한 단계 위로)
        const newIndex = Math.min(index + 1, newShapes.length)
        newShapes.splice(newIndex, 0, shape)
      } else if (direction === 'backward') {
        // 뒤로 (한 단계 아래로)
        const newIndex = Math.max(index - 1, 0)
        newShapes.splice(newIndex, 0, shape)
      } else {
        // 맨 뒤로 (배열 맨 앞으로)
        newShapes.unshift(shape)
      }

      return newShapes
    })
  }, [selectedId])

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2)) // 최대 200%
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.1)) // 최소 10%
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1) // 100%
  }, [])

  // 정렬 기능 - 단일 선택 시: 캔버스 기준, 다중 선택 시: 선택된 도형들 간 기준
  const handleAlignLeft = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const targetX = ids.length === 1 ? 0 : Math.min(...sel.map(s => getShapeBounds(s).x))
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      return { ...s, x: s.x + (targetX - b.x), y: s.y }
    }))
  }, [selectedId, selectedIds, shapes])

  const handleAlignCenterH = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const centerXs = sel.map(s => { const b = getShapeBounds(s); return b.x + b.width / 2 })
    const targetCx = ids.length === 1 ? canvasSize.width / 2 : centerXs.reduce((a, b) => a + b, 0) / centerXs.length
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      const cx = b.x + b.width / 2
      return { ...s, x: s.x + (targetCx - cx), y: s.y }
    }))
  }, [selectedId, selectedIds, shapes, canvasSize.width])

  const handleAlignRight = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const rights = sel.map(s => { const b = getShapeBounds(s); return b.x + b.width })
    const targetRight = ids.length === 1 ? canvasSize.width : Math.max(...rights)
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      return { ...s, x: s.x + (targetRight - (b.x + b.width)), y: s.y }
    }))
  }, [selectedId, selectedIds, shapes, canvasSize.width])

  const handleAlignTop = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const targetY = ids.length === 1 ? 0 : Math.min(...sel.map(s => getShapeBounds(s).y))
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      return { ...s, x: s.x, y: s.y + (targetY - b.y) }
    }))
  }, [selectedId, selectedIds, shapes])

  const handleAlignCenterV = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const centerYs = sel.map(s => { const b = getShapeBounds(s); return b.y + b.height / 2 })
    const targetCy = ids.length === 1 ? canvasSize.height / 2 : centerYs.reduce((a, b) => a + b, 0) / centerYs.length
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      const cy = b.y + b.height / 2
      return { ...s, x: s.x, y: s.y + (targetCy - cy) }
    }))
  }, [selectedId, selectedIds, shapes, canvasSize.height])

  const handleAlignBottom = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (ids.length === 0) return
    const sel = shapes.filter(s => ids.includes(s.id))
    const bottoms = sel.map(s => { const b = getShapeBounds(s); return b.y + b.height })
    const targetBottom = ids.length === 1 ? canvasSize.height : Math.max(...bottoms)
    setShapes(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s
      const b = getShapeBounds(s)
      return { ...s, x: s.x, y: s.y + (targetBottom - (b.y + b.height)) }
    }))
  }, [selectedId, selectedIds, shapes, canvasSize.height])

  // 선택된 도형
  const selectedShape = shapes.find((s) => s.id === selectedId) || null

  // 배경색 (다크모드 연동)
  const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* 상단 헤더 */}
      <div className="h-14 border-b flex items-center px-4 justify-between bg-background z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/diagram')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <TooltipProvider>
            {/* 제목 설정 */}
            <Tooltip>
              <TooltipTrigger asChild>
                {editingTitle ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingTitle(false)
                    }}
                    className="w-64"
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-lg font-semibold cursor-pointer hover:text-primary"
                    onClick={() => setEditingTitle(true)}
                  >
                    {title}
                  </h1>
                )}
              </TooltipTrigger>
              <TooltipContent>제목 설정</TooltipContent>
            </Tooltip>

            {/* 캔버스 크기 설정 */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      {canvasSize.width} × {canvasSize.height}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>캔버스 크기 설정</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-semibold">캔버스 크기 설정</h4>
                  <div className="space-y-2">
                    <Label>너비 (px)</Label>
                    <Input
                      type="number"
                      value={tempCanvasSize.width}
                      onChange={(e) => setTempCanvasSize({ ...tempCanvasSize, width: Number(e.target.value) })}
                      min={100}
                      max={10000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>높이 (px)</Label>
                    <Input
                      type="number"
                      value={tempCanvasSize.height}
                      onChange={(e) => setTempCanvasSize({ ...tempCanvasSize, height: Number(e.target.value) })}
                      min={100}
                      max={10000}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempCanvasSize({ width: 1920, height: 1080 })
                        setCanvasSize({ width: 1920, height: 1080 })
                      }}
                    >
                      FHD (1920×1080)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempCanvasSize({ width: 3840, height: 2160 })
                        setCanvasSize({ width: 3840, height: 2160 })
                      }}
                    >
                      4K (3840×2160)
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setCanvasSize(tempCanvasSize)
                    }}
                  >
                    적용
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {/* 줌 및 정렬 컨트롤 */}
          <TooltipProvider>
            <div className="flex items-center gap-1 mr-2">
              {/* 줌 컨트롤 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>축소</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleZoomReset}>
                    {Math.round(zoom * 100)}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent>원본 크기 (100%)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>확대</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              {/* 정렬 컨트롤 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignLeft}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignHorizontalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>좌측 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignCenterH}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignHorizontalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>수평 중앙 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignRight}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignHorizontalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>우측 정렬</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignTop}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignVerticalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>상단 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignCenterV}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignVerticalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>수직 중앙 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignBottom}
                    disabled={!selectedId && selectedIds.length === 0}
                  >
                    <AlignVerticalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>하단 정렬</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <DiagramExportMenu
            stageRef={stageRef}
            shapes={shapes}
            title={title}
            canvasSize={canvasSize}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 도구 툴바 */}
        <DiagramToolbar tool={tool} onToolChange={setTool} />

        {/* 중앙 캔버스 */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor }}>
          <DiagramCanvas
            stageRef={stageRef}
            shapes={shapes}
            selectedId={selectedId}
            selectedIds={selectedIds}
            tool={tool}
            canvasSize={canvasSize}
            zoom={zoom}
            onShapesChange={setShapes}
            onSelectShape={handleSelectShape}
            onSelectMultiple={handleSelectMultiple}
            backgroundColor={backgroundColor}
          />
        </div>

        {/* 우측 속성 패널 */}
        <DiagramPropertyPanel
          selectedShape={selectedShape}
          shapes={shapes}
          onShapeUpdate={handleShapeUpdate}
          onLayerChange={handleLayerChange}
        />
      </div>
    </div>
  )
}
