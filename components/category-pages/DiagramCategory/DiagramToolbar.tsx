'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MousePointer,
  Square,
  Circle as CircleIcon,
  ArrowRight,
  Type,
  Triangle,
  Hexagon,
  Octagon,
  Star,
  Diamond,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  Cloud,
  FileText,
  Network,
} from 'lucide-react'
import type { DiagramTool, ShapeType } from '@/lib/diagram-utils'

interface DiagramToolbarProps {
  tool: DiagramTool
  onToolChange: (tool: DiagramTool) => void
}

const BASIC_SHAPES: { id: ShapeType; icon: typeof Square; label: string }[] = [
  { id: 'rect', icon: Square, label: '사각형' },
  { id: 'roundedRect', icon: Square, label: '둥근 사각형' },
  { id: 'rectCut', icon: Square, label: '한쪽 잘린 사각형' },
  { id: 'circle', icon: CircleIcon, label: '원' },
  { id: 'triangle', icon: Triangle, label: '삼각형' },
  { id: 'pentagon', icon: Hexagon, label: '오각형' },
  { id: 'hexagon', icon: Hexagon, label: '육각형' },
  { id: 'octagon', icon: Octagon, label: '팔각형' },
  { id: 'star', icon: Star, label: '별' },
  { id: 'arrow', icon: ArrowRight, label: '화살표' },
]

const FLOWCHART_SHAPES: { id: ShapeType; icon: typeof Diamond; label: string }[] = [
  { id: 'diamond', icon: Diamond, label: '다이아몬드 (조건/결정)' },
  { id: 'parallelogram', icon: Square, label: '평행사변형 (데이터)' },
  { id: 'cylinder', icon: Square, label: '원통 (DB)' },
  { id: 'document', icon: FileText, label: '문서' },
]

const BLOCK_ARROWS: { id: ShapeType; icon: typeof ChevronRight; label: string }[] = [
  { id: 'blockArrowRight', icon: ChevronRight, label: '오른쪽' },
  { id: 'blockArrowLeft', icon: ChevronLeft, label: '왼쪽' },
  { id: 'blockArrowUp', icon: ChevronUp, label: '위' },
  { id: 'blockArrowDown', icon: ChevronDown, label: '아래' },
]

const CALLOUTS: { id: ShapeType; icon: typeof MessageCircle; label: string }[] = [
  { id: 'calloutRect', icon: MessageCircle, label: '사각 말풍선' },
  { id: 'calloutOval', icon: MessageCircle, label: '원형 말풍선' },
  { id: 'calloutCloud', icon: Cloud, label: '구름' },
]

const isBasic = (t: DiagramTool) =>
  BASIC_SHAPES.some((s) => s.id === t)
const isFlowchart = (t: DiagramTool) =>
  FLOWCHART_SHAPES.some((s) => s.id === t)
const isBlockArrow = (t: DiagramTool) =>
  BLOCK_ARROWS.some((s) => s.id === t)
const isCallout = (t: DiagramTool) =>
  CALLOUTS.some((s) => s.id === t)

export function DiagramToolbar({ tool, onToolChange }: DiagramToolbarProps) {
  return (
    <TooltipProvider>
      <div className="w-16 border-r bg-background flex flex-col items-center py-4 gap-2">
        {/* 선택 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onToolChange('select')}
              className="w-12 h-12"
            >
              <MousePointer className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>선택 (V)</p>
          </TooltipContent>
        </Tooltip>

        {/* 텍스트 (독립 항목) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'text' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onToolChange('text')}
              className="w-12 h-12"
            >
              <Type className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>텍스트</p>
          </TooltipContent>
        </Tooltip>

        {/* 기본 도형 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={tool !== 'select' && isBasic(tool) ? 'default' : 'ghost'}
                  size="icon"
                  className="w-12 h-12"
                >
                  <Square className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>기본 도형</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-48">
            {BASIC_SHAPES.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onToolChange(s.id)}
                className="flex items-center gap-2"
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 순서도 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={tool !== 'select' && isFlowchart(tool) ? 'default' : 'ghost'}
                  size="icon"
                  className="w-12 h-12"
                >
                  <Network className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>순서도</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-52">
            {FLOWCHART_SHAPES.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onToolChange(s.id)}
                className="flex items-center gap-2"
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 블록 화살표 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={tool !== 'select' && isBlockArrow(tool) ? 'default' : 'ghost'}
                  size="icon"
                  className="w-12 h-12"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>블록 화살표</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-40">
            {BLOCK_ARROWS.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onToolChange(s.id)}
                className="flex items-center gap-2"
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 설명선 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={tool !== 'select' && isCallout(tool) ? 'default' : 'ghost'}
                  size="icon"
                  className="w-12 h-12"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>설명선</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-40">
            {CALLOUTS.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onToolChange(s.id)}
                className="flex items-center gap-2"
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
