'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Konva from 'konva'
import {
  Shape,
  exportToPNG,
  exportToJPG,
  exportToSVG,
  exportToPPTX,
  downloadBlob,
} from '@/lib/diagram-utils'

interface DiagramExportMenuProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>
  shapes: Shape[]
  title: string
  canvasSize: { width: number; height: number }
}

export function DiagramExportMenu({
  stageRef,
  shapes,
  title,
  canvasSize,
}: DiagramExportMenuProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'png' | 'jpg' | 'svg' | 'pptx') => {
    try {
      setExporting(true)

      let blob: Blob
      let filename = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.${format}`

      switch (format) {
        case 'png':
          if (!stageRef.current) throw new Error('캔버스를 찾을 수 없습니다.')
          blob = await exportToPNG(stageRef.current)
          break

        case 'jpg':
          if (!stageRef.current) throw new Error('캔버스를 찾을 수 없습니다.')
          blob = await exportToJPG(stageRef.current)
          break

        case 'svg':
          const svgString = exportToSVG(shapes, canvasSize.width, canvasSize.height)
          blob = new Blob([svgString], { type: 'image/svg+xml' })
          break

        case 'pptx':
          blob = await exportToPPTX(shapes, title, canvasSize.width, canvasSize.height)
          break

        default:
          throw new Error('지원하지 않는 포맷입니다.')
      }

      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Export error:', error)
      toast.error(`내보내기 중 오류가 발생했습니다: ${error}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              내보내는 중...
            </>
          ) : (
            <>
              내보내기
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('png')}>
          PNG 이미지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('jpg')}>
          JPG 이미지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('svg')}>
          SVG 벡터
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pptx')}>
          PowerPoint (PPTX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
