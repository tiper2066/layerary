'use client'

import { useCallback, useRef, useState } from 'react'
import {
  parseGridToCells,
  getHorizontalLineSegments,
  getVerticalLineSegments,
} from '@/lib/edm-utils'
import type { GridConfig, CellLinks } from '@/types/edm'
import type { CellInfo } from '@/types/edm'

interface EdmGridCanvasProps {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  gridConfig: GridConfig
  selectedCellIds: string[]
  cellLinks: CellLinks
  zoom: number
  onGridConfigChange: (config: GridConfig) => void
  onCellSelect: (cellIds: string[]) => void
}

function getCellAtPoint(cells: CellInfo[], x: number, y: number): CellInfo | null {
  return cells.find((c) => x >= c.left && x < c.left + c.width && y >= c.top && y < c.top + c.height) ?? null
}

function getCellsInRect(cells: CellInfo[], anchor: CellInfo, current: CellInfo): string[] {
  const minR = Math.min(anchor.row, current.row)
  const maxR = Math.max(anchor.row + anchor.rowSpan - 1, current.row + current.rowSpan - 1)
  const minC = Math.min(anchor.col, current.col)
  const maxC = Math.max(anchor.col + anchor.colSpan - 1, current.col + current.colSpan - 1)
  const ids: string[] = []
  for (const c of cells) {
    const cEndR = c.row + c.rowSpan - 1
    const cEndC = c.col + c.colSpan - 1
    if (c.row <= maxR && cEndR >= minR && c.col <= maxC && cEndC >= minC) {
      ids.push(c.id)
    }
  }
  return ids
}

export function EdmGridCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  gridConfig,
  selectedCellIds,
  cellLinks,
  zoom,
  onGridConfigChange,
  onCellSelect,
}: EdmGridCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingLine, setDraggingLine] = useState<{ type: 'h' | 'v'; index: number } | null>(null)
  const [selecting, setSelecting] = useState(false)
  const anchorCellRef = useRef<CellInfo | null>(null)
  const justFinishedSelectRef = useRef(false)

  const cells = parseGridToCells(gridConfig)
  const { rows, cols } = gridConfig
  const hLineSegments = getHorizontalLineSegments(gridConfig)
  const vLineSegments = getVerticalLineSegments(gridConfig)

  const handleLineMouseDown = useCallback(
    (type: 'h' | 'v', index: number) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDraggingLine({ type, index })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      if (selecting && anchorCellRef.current) {
        const currentCell = getCellAtPoint(cells, x, y)
        if (currentCell) {
          const ids = getCellsInRect(cells, anchorCellRef.current, currentCell)
          onCellSelect(ids)
        }
        return
      }

      if (!draggingLine) return

      if (draggingLine.type === 'h') {
        const prev = rows[draggingLine.index - 1] ?? 0
        const next = rows[draggingLine.index + 1] ?? 100
        const clamped = Math.max(prev + 2, Math.min(next - 2, y))
        const newRows = [...rows]
        newRows[draggingLine.index] = clamped
        onGridConfigChange({ ...gridConfig, rows: newRows })
      } else {
        const prev = cols[draggingLine.index - 1] ?? 0
        const next = cols[draggingLine.index + 1] ?? 100
        const clamped = Math.max(prev + 2, Math.min(next - 2, x))
        const newCols = [...cols]
        newCols[draggingLine.index] = clamped
        onGridConfigChange({ ...gridConfig, cols: newCols })
      }
    },
    [selecting, draggingLine, rows, cols, gridConfig, onGridConfigChange, cells, onCellSelect]
  )

  const handleMouseUp = useCallback(() => {
    if (selecting) {
      justFinishedSelectRef.current = true
    }
    setDraggingLine(null)
    setSelecting(false)
    anchorCellRef.current = null
  }, [selecting])

  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, cell: CellInfo) => {
      e.stopPropagation()
      if (e.button !== 0) return
      setSelecting(true)
      anchorCellRef.current = cell
      onCellSelect([cell.id])
    },
    [onCellSelect]
  )

  const handleCellMouseEnter = useCallback(
    (e: React.MouseEvent, cell: CellInfo) => {
      if (!selecting || !anchorCellRef.current) return
      const ids = getCellsInRect(cells, anchorCellRef.current, cell)
      onCellSelect(ids)
    },
    [selecting, cells, onCellSelect]
  )

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // 드래그 선택 직후 클릭은 무시 (선택 유지)
      if (justFinishedSelectRef.current) {
        justFinishedSelectRef.current = false
        return
      }
      // 배경(빈 영역) 클릭 시에만 선택 해제
      if (e.target === e.currentTarget) {
        onCellSelect([])
      }
    },
    [onCellSelect]
  )

  return (
    <div
      className="relative h-full overflow-auto"
      style={{ backgroundColor: 'var(--muted)' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-h-full min-w-full flex items-center justify-center p-4">
        <div
          ref={containerRef}
          className="relative shrink-0"
        style={{
          width: imageWidth * zoom,
          height: imageHeight * zoom,
          minWidth: 200,
          minHeight: 150,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="eDM"
          className="absolute inset-0 w-full h-full object-contain block"
          style={{ pointerEvents: 'none' }}
        />

        <div
          className="absolute inset-0 cursor-default"
          onClick={handleBackgroundClick}
          style={{ zIndex: 1 }}
        >
          {cells.map((cell) => {
            const hasLink = !!cellLinks[cell.id]
            const isSelected = selectedCellIds.includes(cell.id)
            return (
              <div
                key={cell.id}
                className={`absolute cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-red-500/50 ring-2 ring-primary'
                    : hasLink
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
                      : 'hover:bg-primary/10'
                }`}
                style={{
                  left: `${cell.left}%`,
                  top: `${cell.top}%`,
                  width: `${cell.width}%`,
                  height: `${cell.height}%`,
                }}
                onMouseDown={(e) => handleCellMouseDown(e, cell)}
                onMouseEnter={(e) => handleCellMouseEnter(e, cell)}
              >
                <span className="absolute bottom-1 right-1 text-xs font-medium text-white drop-shadow-md bg-black/50 px-1 rounded">
                  {cell.id}
                </span>
              </div>
            )
          })}

          {rows.slice(1, -1).map((_, i) =>
            hLineSegments[i]?.map(([left, right], j) => (
              <div
                key={`h-${i}-${j}`}
                className="absolute h-1 bg-blue-500 cursor-ns-resize hover:bg-blue-600 z-10"
                style={{
                  left: `${left}%`,
                  width: `${right - left}%`,
                  top: `${rows[i + 1]}%`,
                  transform: 'translateY(-50%)',
                }}
                onMouseDown={handleLineMouseDown('h', i + 1)}
              />
            ))
          )}
          {cols.slice(1, -1).map((_, i) =>
            vLineSegments[i]?.map(([top, bottom], j) => (
              <div
                key={`v-${i}-${j}`}
                className="absolute w-1 bg-blue-500 cursor-ew-resize hover:bg-blue-600 z-10"
                style={{
                  top: `${top}%`,
                  height: `${bottom - top}%`,
                  left: `${cols[i + 1]}%`,
                  transform: 'translateX(-50%)',
                }}
                onMouseDown={handleLineMouseDown('v', i + 1)}
              />
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
