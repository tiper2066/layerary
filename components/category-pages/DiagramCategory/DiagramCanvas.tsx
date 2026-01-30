'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Circle, Arrow, Text, Transformer, RegularPolygon, Star, Line, Path, Ellipse } from 'react-konva'
import Konva from 'konva'
import { Shape, createShape, getShapeBounds, getCalloutRectPathData, getBlockArrowPoints, CALLOUT_OVAL_PATH_TEMPLATE, CALLOUT_OVAL_BASE_WIDTH, CALLOUT_OVAL_BASE_HEIGHT, type DiagramTool } from '@/lib/diagram-utils'

interface DiagramCanvasProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>
  shapes: Shape[]
  selectedId: string | null
  selectedIds: string[] // 다중 선택
  tool: DiagramTool
  canvasSize: { width: number; height: number }
  zoom: number
  onShapesChange: (shapes: Shape[]) => void
  onSelectShape: (id: string | null, addToSelection?: boolean) => void
  onSelectMultiple: (ids: string[]) => void
  backgroundColor: string
}

function DiagramCanvas({
  stageRef,
  shapes,
  selectedId,
  selectedIds,
  tool,
  canvasSize,
  zoom,
  onShapesChange,
  onSelectShape,
  onSelectMultiple,
  backgroundColor,
}: DiagramCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const selectionRectRef = useRef<Konva.Rect>(null)
  const [selectionBox, setSelectionBox] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null)
  const isDraggingRef = useRef(false) // 드래그 상태 추적
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextRect, setEditingTextRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const stageWrapperRef = useRef<HTMLDivElement>(null)
  const editingTextDataRef = useRef<{ rect: { x: number; y: number; width: number; height: number }; zoom: number } | null>(null)

  // Transformer 업데이트 (다중 선택 지원)
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return

    // 다중 선택이 있으면 우선
    const idsToSelect = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    
    if (idsToSelect.length > 0) {
      const nodes = idsToSelect.map(id => layerRef.current!.findOne(`#${id}`)).filter(Boolean) as Konva.Node[]
      if (nodes.length > 0) {
        transformerRef.current.nodes(nodes)
      }
    } else {
      transformerRef.current.nodes([])
    }
  }, [selectedId, selectedIds])

  // 텍스트 더블클릭 후 편집창 위치·크기: 스테이지 좌표(rect)에 zoom만 적용해 래퍼 기준으로 계산
  useEffect(() => {
    if (!editingTextId) return
    const data = editingTextDataRef.current
    if (!data) return
    const raf = requestAnimationFrame(() => {
      const { rect, zoom } = data
      // rect는 Konva 노드의 getClientRect() 결과값으로, 
      // 이미 노드의 absolute position과 scale, rotation 등이 반영된 스테이지 기준 좌표입니다.
      // 하지만 줌(Stage의 scale)이 적용된 상태의 '화면상 좌표'가 아니라 '스테이지 내부 좌표'이므로
      // 화면에 그릴 때는 zoom을 곱해줘야 합니다.
      const x = rect.x * zoom
      const y = rect.y * zoom
      const width = Math.max(80, rect.width * zoom)
      const height = Math.max(24, rect.height * zoom)
      setEditingTextRect({ x, y, width, height })
      editingTextDataRef.current = null
    })
    return () => cancelAnimationFrame(raf)
  }, [editingTextId])

  // Delete 키로 도형 삭제 및 방향키로 이동
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드(속성 패널, 편집 textarea 등)에 포커스가 있으면 도형 삭제/이동 처리하지 않음
      const target = e.target as HTMLElement
      if (target?.closest('input') || target?.closest('textarea') || target?.getAttribute('contenteditable') === 'true') {
        return
      }

      // 선택된 도형 ID 목록 (다중 선택 우선)
      const idsToOperate = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
      if (idsToOperate.length === 0) return

      // Delete 또는 Backspace 키
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onShapesChange(shapes.filter((s) => !idsToOperate.includes(s.id)))
        onSelectShape(null)
      }

      // 방향키로 도형 이동 (다중 선택 지원)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1 // Shift 키를 누르면 10px씩 이동

        onShapesChange(
          shapes.map((s) => {
            if (!idsToOperate.includes(s.id)) return s

            let newX = s.x
            let newY = s.y

            if (e.key === 'ArrowLeft') newX -= step
            if (e.key === 'ArrowRight') newX += step
            if (e.key === 'ArrowUp') newY -= step
            if (e.key === 'ArrowDown') newY += step

            return { ...s, x: newX, y: newY }
          })
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, shapes, onShapesChange, onSelectShape])

  // 드래그 영역 선택을 위한 마우스 이벤트
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 도형을 클릭한 경우 선택 박스 시작 안함
    if (e.target !== e.target.getStage()) {
      return
    }

    // 도형 추가 모드가 아니고, 빈 공간을 클릭한 경우에만 영역 선택 시작
    if (tool !== 'select') {
      return
    }

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setSelectionBox({
      x1: pos.x / zoom,
      y1: pos.y / zoom,
      x2: pos.x / zoom,
      y2: pos.y / zoom,
    })
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setSelectionBox({
      ...selectionBox,
      x2: pos.x / zoom,
      y2: pos.y / zoom,
    })
  }

  const handleMouseUp = () => {
    if (!selectionBox) return

    // 선택 영역 계산
    const box = {
      x: Math.min(selectionBox.x1, selectionBox.x2),
      y: Math.min(selectionBox.y1, selectionBox.y2),
      width: Math.abs(selectionBox.x2 - selectionBox.x1),
      height: Math.abs(selectionBox.y2 - selectionBox.y1),
    }

    // 영역 내 도형 찾기 (getShapeBounds로 통일)
    const selectedShapeIds: string[] = []
    shapes.forEach((shape) => {
      const b = getShapeBounds(shape)
      const intersects =
        box.x < b.x + b.width &&
        box.x + box.width > b.x &&
        box.y < b.y + b.height &&
        box.y + box.height > b.y
      if (intersects) selectedShapeIds.push(shape.id)
    })

    if (selectedShapeIds.length > 0) {
      onSelectMultiple(selectedShapeIds)
    }

    setSelectionBox(null)
  }

  // 캔버스 클릭 → 새 도형 추가 또는 선택 해제
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 도형을 클릭한 경우 (빈 공간이 아님)
    if (e.target !== e.target.getStage()) {
      return
    }

    // 빈 공간 클릭 시
    if (tool === 'select') {
      // 선택 모드일 때는 선택 해제
      onSelectShape(null)
      return
    }

    // 도형 추가 모드일 때 새 도형 추가
    const stage = e.target.getStage()
    if (!stage) return

    const pointerPosition = stage.getPointerPosition()
    if (!pointerPosition) return

    const cx = pointerPosition.x / zoom
    const cy = pointerPosition.y / zoom
    const newShape = createShape(tool, cx, cy)
    onShapesChange([...shapes, newShape])
    onSelectShape(newShape.id)
  }

  // 도형 드래그 시작
  const handleDragStart = () => {
    isDraggingRef.current = true
  }

  // 도형 드래그 (다중 선택 지원)
  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    // 드래그가 끝나면 플래그 리셋 (약간의 지연 추가)
    setTimeout(() => {
      isDraggingRef.current = false
    }, 10)
    
    const node = e.target
    const shape = shapes.find((s) => s.id === id)
    if (!shape) return
    
    // 다중 선택된 경우, 모든 선택된 도형을 함께 이동
    const idsToMove = selectedIds.length > 0 && selectedIds.includes(id) ? selectedIds : [id]
    
    if (idsToMove.length === 1) {
      // 단일 도형 이동
      let updatedShape: Partial<Shape> = {
        x: node.x(),
        y: node.y(),
      }
      
      if (shape.type === 'circle' && shape.radius) {
        updatedShape = { x: node.x() - shape.radius, y: node.y() - shape.radius }
      } else if (shape.type === 'calloutOval' && shape.width && shape.height) {
        // Path 기준이 좌상단이므로 중심으로 저장
        updatedShape = {
          x: node.x() + shape.width / 2,
          y: node.y() + shape.height / 2,
        }
      }
      
      const updatedShapes = shapes.map((s) =>
        s.id === id ? { ...s, ...updatedShape } : s
      )
      onShapesChange(updatedShapes)
    } else {
      // 다중 선택 이동: Transformer가 자동으로 처리하므로 여기서는 스킵
      // TransformEnd에서 일괄 처리됨
    }
  }

  // Transformer 드래그 종료 처리 (다중 선택 시)
  const handleTransformerDragEnd = () => {
    if (!transformerRef.current || !layerRef.current) return
    
    const nodes = transformerRef.current.nodes()
    if (nodes.length === 0) return
    
    const updatedShapes = shapes.map((shape) => {
      const node = nodes.find((n) => n.id() === shape.id)
      if (!node) return shape
      let x = node.x()
      let y = node.y()
      if (shape.type === 'circle' && shape.radius) {
        x = node.x() - shape.radius
        y = node.y() - shape.radius
      } else if (shape.type === 'calloutOval' && shape.width && shape.height) {
        x = node.x() + shape.width / 2
        y = node.y() + shape.height / 2
      }
      return { ...shape, x, y }
    })
    onShapesChange(updatedShapes)
  }

  // 도형 변형 (크기 조절 및 회전)
  const handleTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation() // 회전 각도 가져오기

    // 스케일을 실제 크기로 변환
    node.scaleX(1)
    node.scaleY(1)

    const shape = shapes.find((s) => s.id === id)
    if (!shape) return

    let updatedShape: Partial<Shape> = {
      x: node.x(),
      y: node.y(),
      rotation, // 회전 각도 저장
    }

    if (shape.type === 'rect' && shape.width && shape.height) {
      updatedShape = {
        ...updatedShape,
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
      }
    } else if (shape.type === 'roundedRect' && shape.width && shape.height) {
      updatedShape = {
        ...updatedShape,
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
      }
    } else if (shape.type === 'circle' && shape.radius) {
      const newRadius = Math.max(5, shape.radius * scaleX)
      updatedShape = {
        ...updatedShape,
        x: node.x() - newRadius,
        y: node.y() - newRadius,
        radius: newRadius,
      }
    } else if ((shape.type === 'triangle' || shape.type === 'pentagon' || shape.type === 'hexagon' || shape.type === 'octagon') && shape.radius) {
      const newRadius = Math.max(5, shape.radius * scaleX)
      updatedShape = { ...updatedShape, radius: newRadius }
    } else if (shape.type === 'diamond' && shape.radius) {
      const newRadius = Math.max(5, shape.radius * scaleX)
      updatedShape = {
        ...updatedShape,
        radius: newRadius,
        rotation: rotation,
      }
    } else if (shape.type === 'star' && (shape.outerRadius ?? shape.radius)) {
      const outer = shape.outerRadius ?? shape.radius ?? 50
      const inner = shape.innerRadius ?? outer * 0.4
      updatedShape = {
        ...updatedShape,
        outerRadius: Math.max(5, outer * scaleX),
        innerRadius: Math.max(2, inner * scaleX),
      }
    } else if (shape.type === 'text') {
      // 리사이즈 시 글자 크기·너비를 스케일에 맞춰 동기화
      const baseFontSize = shape.fontSize ?? 24
      const baseWidth = shape.width ?? 200
      
      // Transformer의 activeAnchor를 확인하여 어떤 핸들을 잡았는지 판단
      const transformer = transformerRef.current
      const anchor = transformer?.getActiveAnchor()
      
      // 모서리 핸들(top-left, top-right, bottom-left, bottom-right)인 경우에만 폰트 크기 변경
      const isCorner = anchor === 'top-left' || anchor === 'top-right' || anchor === 'bottom-left' || anchor === 'bottom-right'
      
      const scaleAvg = (scaleX + scaleY) / 2
      const newFontSize = isCorner ? Math.max(8, Math.round(baseFontSize * scaleAvg)) : baseFontSize
      const newWidth = Math.max(40, Math.round(baseWidth * scaleX))
      
      updatedShape = {
        ...updatedShape,
        fontSize: newFontSize,
        width: newWidth,
      }
    } else if (shape.type === 'arrow' && shape.points && shape.points.length >= 4) {
      // 선 길이만 스케일 적용, 머리(pointerLength/pointerWidth)는 유지
      const [x1, y1, x2, y2] = shape.points
      const dx = x2 - x1
      const dy = y2 - y1
      let nx = dx * scaleX
      let ny = dy * scaleY
      const len = Math.hypot(nx, ny)
      if (len < 1) {
        const oldLen = Math.hypot(dx, dy) || 1
        const k = 1 / oldLen
        nx = dx * k
        ny = dy * k
      }
      updatedShape = {
        ...updatedShape,
        points: [0, 0, nx, ny],
        pointerLength: shape.pointerLength ?? 10,
        pointerWidth: shape.pointerWidth ?? 10,
      }
    } else if ((shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft' || shape.type === 'blockArrowUp' || shape.type === 'blockArrowDown') && (shape.width != null && shape.height != null)) {
      // 몸통(shaft)만 스케일, 머리(pointerLength/pointerWidth) 유지
      const headLen = shape.pointerLength ?? 20
      const headW = shape.pointerWidth ?? 40
      const isHorz = shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft'
      const shaft = isHorz ? (shape.width - headLen) : (shape.height - headLen)
      const scale = isHorz ? scaleX : scaleY
      const newShaft = Math.max(1, shaft * scale)
      const nw = isHorz ? newShaft + headLen : headW
      const nh = isHorz ? headW : newShaft + headLen
      updatedShape = {
        ...updatedShape,
        width: nw,
        height: nh,
        pointerLength: headLen,
        pointerWidth: headW,
      }
    } else if ((shape.type === 'parallelogram' || shape.type === 'rectCut') && shape.points?.length) {
      const pts = shape.points
      const nx: number[] = []
      for (let i = 0; i < pts.length; i += 2) {
        nx.push(pts[i] * scaleX, pts[i + 1] * scaleY)
      }
      updatedShape = { ...updatedShape, points: nx }
    } else if ((shape.type === 'calloutRect' || (shape.type === 'calloutOval' && !shape.pathData)) && shape.width && shape.height) {
      const dir = shape.tailDirection ?? 'bottom'
      const scaleForTail = dir === 'left' || dir === 'right' ? scaleX : scaleY
      const newTailSize = Math.max(6, Math.round((shape.tailSize ?? 12) * scaleForTail))
      updatedShape = {
        ...updatedShape,
        width: Math.max(20, shape.width * scaleX),
        height: Math.max(10, shape.height * scaleY),
        tailSize: newTailSize,
      }
      if (shape.type === 'calloutOval') {
        updatedShape.x = node.x() + (updatedShape.width ?? shape.width) / 2
        updatedShape.y = node.y() + (updatedShape.height ?? shape.height) / 2
      }
    } else if (shape.pathData && (shape.type === 'cylinder' || shape.type === 'document' || shape.type === 'calloutCloud' || shape.type === 'calloutOval')) {
      // Path는 scaleX/scaleY로 크기 적용. 새 크기 = base*scale
      const baseW = shape.type === 'cylinder' ? 80 : shape.type === 'document' ? 80 : shape.type === 'calloutOval' ? CALLOUT_OVAL_BASE_WIDTH : 100
      const baseH = shape.type === 'cylinder' ? 60 : shape.type === 'document' ? 100 : shape.type === 'calloutOval' ? CALLOUT_OVAL_BASE_HEIGHT : 115
      updatedShape = {
        ...updatedShape,
        width: Math.max(20, baseW * scaleX),
        height: Math.max(15, baseH * scaleY),
      }
      if (shape.type === 'calloutOval') {
        const nw = updatedShape.width ?? shape.width ?? CALLOUT_OVAL_BASE_WIDTH
        const nh = updatedShape.height ?? shape.height ?? CALLOUT_OVAL_BASE_HEIGHT
        updatedShape.x = node.x() + nw / 2
        updatedShape.y = node.y() + nh / 2
      }
    }

    const updatedShapes = shapes.map((s) =>
      s.id === id ? { ...s, ...updatedShape } : s
    )
    onShapesChange(updatedShapes)
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* 사용 가이드 */}
      <div className="bg-muted/50 border-b px-4 py-2 text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium">사용 방법:</span> 좌측 툴바에서 도형을 선택하고 캔버스를 클릭하세요&nbsp; • &nbsp;
        텍스트: 더블클릭으로 내용 편집, Shift+Enter로 줄바꿈&nbsp; • &nbsp;
        삭제: 도형 선택 후 <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Delete</kbd> 키 클릭&nbsp; • &nbsp; 
        <br />
        이동: <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">방향키</kbd> ( <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Shift</kbd> + 방향키 - 10px )&nbsp; • &nbsp;
        회전: <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Shift</kbd> + 회전 - 15도
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          ref={stageWrapperRef}
          style={{
            position: 'relative',
            width: canvasSize.width * zoom,
            height: canvasSize.height * zoom,
            flexShrink: 0,
          }}
        >
          <div style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)', position: 'absolute', inset: 0 }}>
          <Stage
            ref={(node) => {
              if (stageRef) stageRef.current = node
            }}
            width={canvasSize.width * zoom}
            height={canvasSize.height * zoom}
            scaleX={zoom}
            scaleY={zoom}
            onClick={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ backgroundColor }}
          >
            <Layer ref={layerRef}>
              {shapes.map((shape) => {
                const isSelected = shape.id === selectedId || selectedIds.includes(shape.id)

                if (shape.type === 'rect' && shape.width && shape.height) {
                return (
                  <Rect
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    rotation={shape.rotation || 0}
                    draggable
                    onDragStart={handleDragStart}
                    onClick={(e) => {
                      // 드래그 후에는 클릭 이벤트 무시
                      if (isDraggingRef.current) {
                        return
                      }
                      e.cancelBubble = true // 이벤트 전파 방지
                      onSelectShape(shape.id, e.evt.shiftKey)
                    }}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'pointer'
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'default'
                    }}
                  />
                )
              }

              if (shape.type === 'circle' && shape.radius) {
                return (
                  <Circle
                    key={shape.id}
                    id={shape.id}
                    x={shape.x + shape.radius}
                    y={shape.y + shape.radius}
                    radius={shape.radius}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    rotation={shape.rotation || 0}
                    draggable
                    onDragStart={handleDragStart}
                    onClick={(e) => {
                      // 드래그 후에는 클릭 이벤트 무시
                      if (isDraggingRef.current) {
                        return
                      }
                      e.cancelBubble = true // 이벤트 전파 방지
                      onSelectShape(shape.id, e.evt.shiftKey)
                    }}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'pointer'
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'default'
                    }}
                  />
                )
              }

              if (shape.type === 'text') {
                return (
                  <Text
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width ?? 200}
                    text={shape.text ?? ''}
                    fontSize={shape.fontSize ?? 24}
                    fontFamily={shape.fontFamily ?? 'Arial'}
                    align={shape.align ?? 'left'}
                    wrap="word"
                    lineHeight={1.2}
                    fill={shape.fill ?? '#000000'}
                    rotation={shape.rotation || 0}
                    draggable
                    onDragStart={handleDragStart}
                    onClick={(e) => {
                      if (isDraggingRef.current) return
                      e.cancelBubble = true
                      onSelectShape(shape.id, e.evt.shiftKey)
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true
                      const node = e.target
                      // getClientRect()는 스테이지의 scale(zoom)이 1일 때를 기준으로 한 좌표를 반환할 수 있습니다.
                      // relativeTo: node.getLayer()를 명시하여 레이어 기준 좌표를 가져옵니다.
                      const layer = node.getLayer()
                      const rect = node.getClientRect({ relativeTo: layer ?? undefined })
                      editingTextDataRef.current = { rect, zoom }
                      setEditingTextId(shape.id)
                      setEditingTextValue(shape.text ?? '')
                      setEditingTextRect(null)
                    }}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'pointer'
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'default'
                    }}
                  />
                )
              }

              if (shape.type === 'arrow' && shape.points) {
                return (
                  <Arrow
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    points={shape.points}
                    fill={shape.fill}
                    stroke={shape.fill}
                    strokeWidth={shape.strokeWidth}
                    pointerLength={shape.pointerLength}
                    pointerWidth={shape.pointerWidth}
                    rotation={shape.rotation || 0}
                    draggable
                    onDragStart={handleDragStart}
                    onClick={(e) => {
                      if (isDraggingRef.current) return
                      e.cancelBubble = true
                      onSelectShape(shape.id, e.evt.shiftKey)
                    }}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'pointer'
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'default'
                    }}
                  />
                )
              }

              const baseHandlers = {
                draggable: true,
                onDragStart: handleDragStart,
                onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                  if (isDraggingRef.current) return
                  e.cancelBubble = true
                  onSelectShape(shape.id, e.evt.shiftKey)
                },
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(shape.id, e),
                onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(shape.id, e),
                onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const container = e.target.getStage()?.container()
                  if (container) container.style.cursor = 'pointer'
                },
                onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const container = e.target.getStage()?.container()
                  if (container) container.style.cursor = 'default'
                },
              }

              if (shape.type === 'roundedRect' && shape.width && shape.height) {
                return (
                  <Rect
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    cornerRadius={shape.cornerRadius ?? 10}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if ((shape.type === 'triangle' || shape.type === 'pentagon' || shape.type === 'hexagon' || shape.type === 'octagon') && shape.sides && shape.radius) {
                return (
                  <RegularPolygon
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    sides={shape.sides}
                    radius={shape.radius}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if (shape.type === 'diamond' && shape.radius) {
                return (
                  <RegularPolygon
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    sides={4}
                    radius={shape.radius}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if (shape.type === 'star' && (shape.outerRadius ?? shape.radius)) {
                const outer = shape.outerRadius ?? shape.radius ?? 50
                const inner = shape.innerRadius ?? outer * 0.4
                return (
                  <Star
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    numPoints={shape.numPoints ?? 5}
                    innerRadius={inner}
                    outerRadius={outer}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if ((shape.type === 'parallelogram' || shape.type === 'rectCut') && shape.points && shape.points.length >= 6) {
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    points={shape.points}
                    closed
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }
              if ((shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft' || shape.type === 'blockArrowUp' || shape.type === 'blockArrowDown') && shape.width != null && shape.height != null) {
                const headLen = shape.pointerLength ?? 20
                const headW = shape.pointerWidth ?? 40
                const isHorz = shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft'
                const shaft = isHorz ? shape.width - headLen : shape.height - headLen
                const pts = getBlockArrowPoints(shape.type, Math.max(1, shaft), headLen, headW)
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    points={pts}
                    closed
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if ((shape.type === 'cylinder' || shape.type === 'document' || shape.type === 'calloutCloud') && shape.pathData) {
                const baseW = shape.type === 'cylinder' ? 80 : shape.type === 'document' ? 80 : 100
                const baseH = shape.type === 'cylinder' ? 60 : shape.type === 'document' ? 100 : 115
                const pathW = shape.width ?? baseW
                const pathH = shape.height ?? baseH
                return (
                  <Path
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    data={shape.pathData}
                    scaleX={pathW / baseW}
                    scaleY={pathH / baseH}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    strokeScaleEnabled={false}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if (shape.type === 'calloutRect' && shape.width && shape.height) {
                return (
                  <Path
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    data={getCalloutRectPathData(shape)}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              if (shape.type === 'calloutOval' && shape.width && shape.height) {
                const w = shape.width
                const h = shape.height
                // 항상 제공하신 SVG 템플릿 경로 사용 (pathData 없으면 템플릿으로 그릇 모양 방지)
                const pathData = shape.pathData || CALLOUT_OVAL_PATH_TEMPLATE
                return (
                  <Path
                    key={shape.id}
                    id={shape.id}
                    x={shape.x - w / 2}
                    y={shape.y - h / 2}
                    data={pathData}
                    scaleX={w / CALLOUT_OVAL_BASE_WIDTH}
                    scaleY={h / CALLOUT_OVAL_BASE_HEIGHT}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth ?? 2}
                    strokeScaleEnabled={false}
                    rotation={shape.rotation ?? 0}
                    {...baseHandlers}
                  />
                )
              }

              return null
            })}

            {/* 선택 박스 렌더링 */}
            {selectionBox && (
              <Rect
                ref={selectionRectRef}
                x={Math.min(selectionBox.x1, selectionBox.x2)}
                y={Math.min(selectionBox.y1, selectionBox.y2)}
                width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={1 / zoom}
                dash={[4 / zoom, 4 / zoom]}
              />
            )}

            <Transformer
              ref={transformerRef}
              rotationSnaps={[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345]} // Shift 키로 15도씩 회전
              rotationSnapTolerance={5}
              anchorCornerRadius={5}
              anchorSize={8}
              borderStroke="#3b82f6"
              borderStrokeWidth={2}
              boundBoxFunc={(oldBox, newBox) => {
                // 최소 크기 제한
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
              // 회전 핸들에 커서 스타일 적용 (표준 회전 커서)
              rotateAnchorCursor="crosshair"
              // 다중 선택 드래그 지원
              onDragEnd={handleTransformerDragEnd}
            />
          </Layer>
        </Stage>
          </div>
          {editingTextId && editingTextRect && (
            <textarea
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={() => {
                const id = editingTextId
                if (!id) return
                const shape = shapes.find((s) => s.id === id)
                const fontSize = shape?.fontSize ?? 24
                
                // 임시 텍스트 노드를 생성하여 실제 텍스트 너비 측정
                const tempText = new Konva.Text({
                  text: editingTextValue,
                  fontSize: fontSize,
                  fontFamily: shape?.fontFamily || 'Arial',
                  lineHeight: 1.2,
                  wrap: 'word',
                  width: shape?.width || 200,
                })
                
                const actualWidth = Math.max(40, Math.ceil(tempText.getTextWidth()) + 10)
                tempText.destroy()
                
                onShapesChange(
                  shapes.map((s) =>
                    s.id === id ? { ...s, text: editingTextValue, width: actualWidth } : s
                  )
                )
                setEditingTextId(null)
                setEditingTextRect(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const id = editingTextId
                  if (!id) return
                  const shape = shapes.find((s) => s.id === id)
                  const fontSize = shape?.fontSize ?? 24
                  
                  const tempText = new Konva.Text({
                    text: editingTextValue,
                    fontSize: fontSize,
                    fontFamily: shape?.fontFamily || 'Arial',
                    lineHeight: 1.2,
                    wrap: 'word',
                    width: shape?.width || 200,
                  })
                  
                  const actualWidth = Math.max(40, Math.ceil(tempText.getTextWidth()) + 10)
                  tempText.destroy()
                  
                  onShapesChange(
                    shapes.map((s) =>
                      s.id === id ? { ...s, text: editingTextValue, width: actualWidth } : s
                    )
                  )
                  setEditingTextId(null)
                  setEditingTextRect(null)
                } else if (e.key === 'Escape') {
                  setEditingTextValue(shapes.find((s) => s.id === editingTextId)?.text ?? '')
                  setEditingTextId(null)
                  setEditingTextRect(null)
                }
              }}
              style={{
                position: 'absolute',
                left: editingTextRect.x,
                top: editingTextRect.y,
                width: editingTextRect.width,
                height: editingTextRect.height,
                padding: '4px',
                fontSize: `${(shapes.find(s => s.id === editingTextId)?.fontSize || 24) * zoom}px`,
                lineHeight: 1.2,
                border: '2px solid #3b82f6',
                borderRadius: '4px',
                outline: 'none',
                resize: 'none',
                fontFamily: shapes.find(s => s.id === editingTextId)?.fontFamily || 'Arial',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                background: 'white',
                zIndex: 1000,
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                textAlign: shapes.find(s => s.id === editingTextId)?.align || 'left',
              }}
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default DiagramCanvas
