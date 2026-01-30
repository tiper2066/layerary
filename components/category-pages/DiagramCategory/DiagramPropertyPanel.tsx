'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Trash2, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { Shape } from '@/lib/diagram-utils'

const WIDTH_HEIGHT_TYPES = [
  'rect',
  'roundedRect',
  'parallelogram',
  'rectCut',
  'document',
  'cylinder',
  'blockArrowRight',
  'blockArrowLeft',
  'blockArrowUp',
  'blockArrowDown',
  'calloutRect',
  'calloutCloud',
] as const

const RADIUS_TYPES = ['circle', 'triangle', 'pentagon', 'hexagon', 'octagon', 'diamond'] as const

function hasStroke(t: Shape['type']) {
  return t !== 'text'
}
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { HexColorPicker } from 'react-colorful'

interface DiagramPropertyPanelProps {
  selectedShape: Shape | null
  shapes: Shape[]
  onShapeUpdate: (updates: Partial<Shape> | null) => void
  onLayerChange: (direction: 'front' | 'forward' | 'backward' | 'back') => void
}

export function DiagramPropertyPanel({
  selectedShape,
  shapes,
  onShapeUpdate,
  onLayerChange,
}: DiagramPropertyPanelProps) {
  if (!selectedShape) {
    return (
      <div className="w-80 border-l bg-background p-4 overflow-y-auto">
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">도형을 선택하세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-l bg-background p-4 overflow-y-auto space-y-4">
      <div>
        <h3 className="font-semibold mb-4">속성</h3>
      </div>

      {/* 위치 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">위치</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className='flex items-center gap-2'>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={Math.round(selectedShape.x)}
              onChange={(e) => onShapeUpdate({ x: Number(e.target.value) })}
              className="h-8"
            />
          </div>
          <div className='flex items-center gap-2'>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={Math.round(selectedShape.y)}
              onChange={(e) => onShapeUpdate({ y: Number(e.target.value) })}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* 크기 (width/height) */}
      {WIDTH_HEIGHT_TYPES.includes(selectedShape.type as (typeof WIDTH_HEIGHT_TYPES)[number]) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">크기</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">너비</Label>
              <Input
                type="number"
                value={Math.round(selectedShape.width ?? 0)}
                onChange={(e) => onShapeUpdate({ width: Math.max(1, Number(e.target.value)) })}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">높이</Label>
              <Input
                type="number"
                value={Math.round(selectedShape.height ?? 0)}
                onChange={(e) => onShapeUpdate({ height: Math.max(1, Number(e.target.value)) })}
                className="h-8"
              />
            </div>
          </div>
        </div>
      )}

      {/* 기본 화살표: 선 길이, 머리 길이/너비 */}
      {selectedShape.type === 'arrow' && selectedShape.points && selectedShape.points.length >= 4 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">화살표</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-16">선 길이</Label>
              <Input
                type="number"
                value={Math.round(
                  Math.hypot(
                    (selectedShape.points[2] ?? 0) - (selectedShape.points[0] ?? 0),
                    (selectedShape.points[3] ?? 0) - (selectedShape.points[1] ?? 0)
                  )
                )}
                onChange={(e) => {
                  const L = Math.max(1, Number(e.target.value))
                  const [x1, y1, x2, y2] = selectedShape.points!
                  const dx = x2 - x1
                  const dy = y2 - y1
                  const len = Math.hypot(dx, dy) || 1
                  const k = L / len
                  onShapeUpdate({ points: [0, 0, dx * k, dy * k] })
                }}
                className="h-8"
              />
            </div>

            <div className='w-full flex justify-between gap-3'>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-24">머리 길이</Label>
                <Input
                  type="number"
                  value={selectedShape.pointerLength ?? 10}
                  onChange={(e) => onShapeUpdate({ pointerLength: Math.max(1, Number(e.target.value)) })}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-24">머리 너비</Label>
                <Input
                  type="number"
                  value={selectedShape.pointerWidth ?? 10}
                  onChange={(e) => onShapeUpdate({ pointerWidth: Math.max(1, Number(e.target.value)) })}
                  className="h-8"
                />
              </div>

            </div>



          </div>
        </div>
      )}

      {/* 블록 화살표: 머리 길이/너비 (크기는 기존 width/height) */}
      {(selectedShape.type === 'blockArrowRight' ||
        selectedShape.type === 'blockArrowLeft' ||
        selectedShape.type === 'blockArrowUp' ||
        selectedShape.type === 'blockArrowDown') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">머리</Label>
          <div className="flex justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-24">머리 길이</Label>
              <Input
                type="number"
                value={selectedShape.pointerLength ?? 20}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value))
                  const isHorz =
                    selectedShape.type === 'blockArrowRight' || selectedShape.type === 'blockArrowLeft'
                  const w = selectedShape.width ?? 100
                  const h = selectedShape.height ?? 40
                  const shaft = isHorz ? w - (selectedShape.pointerLength ?? 20) : h - (selectedShape.pointerLength ?? 20)
                  onShapeUpdate(
                    isHorz ? { pointerLength: v, width: shaft + v } : { pointerLength: v, height: shaft + v }
                  )
                }}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-24">머리 너비</Label>
              <Input
                type="number"
                value={selectedShape.pointerWidth ?? 40}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value))
                  const isHorz =
                    selectedShape.type === 'blockArrowRight' || selectedShape.type === 'blockArrowLeft'
                  onShapeUpdate(isHorz ? { pointerWidth: v, height: v } : { pointerWidth: v, width: v })
                }}
                className="h-8"
              />
            </div>
          </div>
        </div>
      )}

      <div className='flex justify-between gap-3'>

        {/* 반지름 (circle, polygon, diamond) */}
        {RADIUS_TYPES.includes(selectedShape.type as (typeof RADIUS_TYPES)[number]) && (
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium w-24">반지름</Label>
            <Input
              type="number"
              value={Math.round(selectedShape.radius ?? 0)}
              onChange={(e) => onShapeUpdate({ radius: Math.max(1, Number(e.target.value)) })}
              className="h-8"
            />
          </div>
        )}

        {/* 다각형 변 개수 (triangle~octagon) */}
        {['triangle', 'pentagon', 'hexagon', 'octagon'].includes(selectedShape.type) && (
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium w-24">변 개수</Label>
            <Input
              type="number"
              value={selectedShape.sides ?? 3}
              onChange={(e) => onShapeUpdate({ sides: Math.max(3, Math.min(12, Number(e.target.value))) })}
              className="h-8"
              min={3}
              max={12}
            />
          </div>
        )}

      </div>

      {/* 별 */}
      {selectedShape.type === 'star' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">별</Label>


          <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground w-[60px]">꼭짓점</Label>
              <Input
                type="number"
                value={selectedShape.numPoints ?? 5}
                onChange={(e) => onShapeUpdate({ numPoints: Math.max(3, Math.min(12, Number(e.target.value))) })}
                className="h-8 flex-1"
              />
          </div>

          <div className="w-full flex justify-between items-center gap-3">

            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground w-[60px]">바깥 반지름</Label>
              <Input
                type="number"
                value={Math.round(selectedShape.outerRadius ?? selectedShape.radius ?? 0)}
                onChange={(e) => onShapeUpdate({ outerRadius: Math.max(1, Number(e.target.value)) })}
                className="h-8 flex-1"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground w-[60px]">안쪽 반지름</Label>
              <Input
                type="number"
                value={Math.round(selectedShape.innerRadius ?? 0)}
                onChange={(e) => onShapeUpdate({ innerRadius: Math.max(0, Number(e.target.value)) })}
                className="h-8 flex-1"
              />
            </div>    

          </div>

        </div>
      )}

      {/* 둥근 모서리 */}
      {(selectedShape.type === 'roundedRect' || selectedShape.type === 'calloutRect') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">모서리 반경</Label>
          <Input
            type="number"
            value={Math.round(selectedShape.cornerRadius ?? 8)}
            onChange={(e) => onShapeUpdate({ cornerRadius: Math.max(0, Number(e.target.value)) })}
            className="h-8"
          />
        </div>
      )}

      <Separator />

      <div className='flex items-center gap-2'>

        {/* 채우기 색상 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">채우기 색상</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedShape.fill || '#000000' }}
                />
                <span className="text-sm">{selectedShape.fill || '#000000'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker
                color={selectedShape.fill || '#000000'}
                onChange={(color) => onShapeUpdate({ fill: color })}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 테두리 색상 (stroke 지원 도형) */}
        {hasStroke(selectedShape.type) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">테두리 색상</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: selectedShape.stroke || '#000000' }}
                  />
                  <span className="text-sm">{selectedShape.stroke || '#000000'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <HexColorPicker
                  color={selectedShape.stroke || '#000000'}
                  onChange={(color) => onShapeUpdate({ stroke: color })}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

      </div>


      {/* 선 두께 (stroke 지원 도형) */}
      {hasStroke(selectedShape.type) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-2">
            <Label className="text-sm font-medium">선 두께</Label>
            <span className="text-xs text-muted-foreground">
              {selectedShape.strokeWidth ?? 0}px
            </span>
          </div>
          <Slider
            value={[selectedShape.strokeWidth ?? 0]}
            onValueChange={([value]) => onShapeUpdate({ strokeWidth: value })}
            min={0}
            max={20}
            step={1}
          />
        </div>
      )}

      {/* 텍스트 속성 */}
      {selectedShape.type === 'text' && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">텍스트</Label>
            <Input
              value={selectedShape.text || ''}
              onChange={(e) => {
                const v = e.target.value
                const fs = selectedShape.fontSize ?? 24
                const minW = Math.max(40, v.length * fs * 0.6)
                const w = Math.max(selectedShape.width ?? 200, minW)
                onShapeUpdate({ text: v, width: w })
              }}
              placeholder="텍스트 입력"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">글자 크기</Label>
            <Input
              type="number"
              value={selectedShape.fontSize ?? 24}
              onChange={(e) => onShapeUpdate({ fontSize: Math.max(8, Number(e.target.value)) })}
              className="h-8"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">정렬</Label>
            <div className="flex gap-1">
              {([
                { align: 'left' as const, icon: AlignLeft, title: '좌측 정렬' },
                { align: 'center' as const, icon: AlignCenter, title: '중앙 정렬' },
                { align: 'right' as const, icon: AlignRight, title: '우측 정렬' },
              ]).map(({ align: newAlign, icon: Icon, title }) => (
                <Button
                  key={newAlign}
                  variant={selectedShape.align === newAlign ? 'default' : 'outline'}
                  size="icon"
                  className="flex-1 h-9 w-9"
                  title={title}
                  onClick={() => {
                    const oldAlign = selectedShape.align ?? 'left'
                    const w = selectedShape.width ?? 200
                    let newX = selectedShape.x
                    if (oldAlign !== newAlign) {
                      if (oldAlign === 'left' && newAlign === 'center') newX = selectedShape.x + w / 2
                      else if (oldAlign === 'left' && newAlign === 'right') newX = selectedShape.x + w
                      else if (oldAlign === 'center' && newAlign === 'left') newX = selectedShape.x - w / 2
                      else if (oldAlign === 'center' && newAlign === 'right') newX = selectedShape.x + w / 2
                      else if (oldAlign === 'right' && newAlign === 'left') newX = selectedShape.x - w
                      else if (oldAlign === 'right' && newAlign === 'center') newX = selectedShape.x - w / 2
                    }
                    onShapeUpdate({ align: newAlign, x: newX })
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* 레이어 순서 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">레이어 순서</Label>
        <div className="grid grid-cols-4 gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLayerChange('front')}
            className="w-full px-2"
            title="맨 앞으로"
          >
            <ChevronsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLayerChange('forward')}
            className="w-full px-2"
            title="앞으로"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLayerChange('backward')}
            className="w-full px-2"
            title="뒤로"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLayerChange('back')}
            className="w-full px-2"
            title="맨 뒤로"
          >
            <ChevronsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* 삭제 버튼 */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => onShapeUpdate(null)}
      >
        삭제
      </Button>
    </div>
  )
}
