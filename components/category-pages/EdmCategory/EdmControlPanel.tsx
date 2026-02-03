'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Minus, ZoomIn, ZoomOut, RotateCcw, TableCellsMerge } from 'lucide-react'
import { getDefaultGridConfig, canMergeCells } from '@/lib/edm-utils'
import type { GridConfig } from '@/types/edm'

interface EdmControlPanelProps {
  gridConfig: GridConfig
  zoom: number
  onGridConfigChange: (config: GridConfig) => void
  onZoomChange: (zoom: number) => void
  hasImage: boolean
  selectedCellIds: string[]
  onMergeCells: () => void
}

export function EdmControlPanel({
  gridConfig,
  zoom,
  onGridConfigChange,
  onZoomChange,
  hasImage,
  selectedCellIds,
  onMergeCells,
}: EdmControlPanelProps) {
  const rowCount = gridConfig.rows.length - 1
  const colCount = gridConfig.cols.length - 1
  const cellCount = rowCount * colCount
  const mergeResult = canMergeCells(gridConfig, selectedCellIds)
  const canMerge = mergeResult.valid

  const addRow = () => {
    const mid = Math.floor(gridConfig.rows.length / 2)
    const newRows = [...gridConfig.rows]
    const prev = newRows[mid - 1] ?? 0
    const next = newRows[mid] ?? 100
    newRows.splice(mid, 0, (prev + next) / 2)
    onGridConfigChange({ ...gridConfig, rows: newRows })
  }

  const removeRow = () => {
    if (gridConfig.rows.length <= 2) return
    const mid = Math.floor(gridConfig.rows.length / 2)
    const newRows = [...gridConfig.rows]
    newRows.splice(mid, 1)
    onGridConfigChange({ ...gridConfig, rows: newRows })
  }

  const addCol = () => {
    const mid = Math.floor(gridConfig.cols.length / 2)
    const newCols = [...gridConfig.cols]
    const prev = newCols[mid - 1] ?? 0
    const next = newCols[mid] ?? 100
    newCols.splice(mid, 0, (prev + next) / 2)
    onGridConfigChange({ ...gridConfig, cols: newCols })
  }

  const removeCol = () => {
    if (gridConfig.cols.length <= 2) return
    const mid = Math.floor(gridConfig.cols.length / 2)
    const newCols = [...gridConfig.cols]
    newCols.splice(mid, 1)
    onGridConfigChange({ ...gridConfig, cols: newCols })
  }

  const resetGrid = () => {
    onGridConfigChange(getDefaultGridConfig())
  }

  const handleZoomIn = () => onZoomChange(Math.min(zoom + 0.1, 2))
  const handleZoomOut = () => onZoomChange(Math.max(zoom - 0.1, 0.1))
  const handleZoomReset = () => onZoomChange(1)
  const handleZoomFit = () => onZoomChange(0.5)

  return (
    <div className="flex flex-wrap items-center gap-2 px-8 py-2 border-b">
      <TooltipProvider>
      <span className="text-sm text-muted-foreground mr-2">
        {rowCount}x{colCount} | {cellCount} cell
      </span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={!hasImage || gridConfig.rows.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>수평 그리드 추가</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={removeRow}
                disabled={!hasImage || gridConfig.rows.length <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>수평 그리드 삭제</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={addCol}
                disabled={!hasImage || gridConfig.cols.length >= 10}
              >
                <Plus className="h-4 w-4 rotate-90" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>수직 그리드 추가</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={removeCol}
                disabled={!hasImage || gridConfig.cols.length <= 2}
              >
                <Minus className="h-4 w-4 rotate-90" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>수직 그리드 삭제</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={resetGrid} disabled={!hasImage}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>그리드 초기화</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onMergeCells}
              disabled={!hasImage || !canMerge}
            >
              <TableCellsMerge className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canMerge ? '셀 병합' : '수평/수직으로 연결된 셀을 드래그로 선택 후 병합'}
          </TooltipContent>
        </Tooltip>

      <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleZoomOut}
              disabled={!hasImage || zoom <= 0.1}
            >
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleZoomIn}
              disabled={!hasImage || zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>확대</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={handleZoomFit}
              disabled={!hasImage}
            >
              전체
            </Button>
          </TooltipTrigger>
          <TooltipContent>화면에 맞춤</TooltipContent>
        </Tooltip>
        </div>
      </TooltipProvider>

      <div className="flex-1" />
    </div>
  )
}
