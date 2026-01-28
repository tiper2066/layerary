'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Layout, Pencil, Trash2 } from 'lucide-react'
import { Flipper, Flipped } from 'react-flip-toolkit'
import { WelcomeBoardCanvas } from './WelcomeBoardCanvas'
import type { WelcomeBoardTemplate, UserEditData } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardGalleryProps {
  templates: WelcomeBoardTemplate[]
  loading: boolean
  isAdmin: boolean
  onSelectTemplate: (template: WelcomeBoardTemplate) => void
  onEditTemplate?: (template: WelcomeBoardTemplate) => void
  onDeleteTemplate?: (templateId: string) => void
}

// 카드 너비 상수
const CARD_WIDTH = 330

export function WelcomeBoardGallery({
  templates,
  loading,
  isAdmin,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: WelcomeBoardGalleryProps) {
  // 기본 userEditData (텍스트는 기본값 사용, 로고 없음)
  const defaultUserEditData: UserEditData = useMemo(() => ({
    textValues: {},
    logoUrl: null,
  }), [])

  // Masonry 레이아웃을 위한 상태
  const [columns, setColumns] = useState<WelcomeBoardTemplate[][]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 컨테이너 너비에 따라 열 개수 계산
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const gap = 24 // gap-6 = 24px
    
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (CARD_WIDTH + gap)))
    
    const newColumns: WelcomeBoardTemplate[][] = Array(numColumns).fill(null).map(() => [])
    
    templates.forEach((template) => {
      const shortestColumnIndex = newColumns.reduce((minIndex, column, i) => {
        return column.length < newColumns[minIndex].length ? i : minIndex
      }, 0)
      newColumns[shortestColumnIndex].push(template)
    })
    
    setColumns(newColumns)
  }, [templates])

  // 컬럼 계산 및 리사이즈 핸들러
  useEffect(() => {
    if (templates.length === 0) {
      setColumns([])
      return
    }

    calculateColumns()

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        calculateColumns()
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [calculateColumns, templates.length])

  // Flipper의 flipKey
  const flipKey = columns.length > 0 
    ? `welcomeboard:${columns.map((col, idx) => `${idx}:${col.map(t => t.id).join(',')}`).join('|')}`
    : 'empty'

  if (loading) {
    return (
      <div ref={containerRef} className="masonry-container justify-center md:justify-start">
        {Array.from({ length: Math.min(4, Math.max(1, Math.floor((containerRef.current?.offsetWidth || 1200) / (CARD_WIDTH + 24)))) }).map((_, colIndex) => (
          <div key={colIndex} className="masonry-column" style={{ flex: `0 0 ${CARD_WIDTH}px`, width: `${CARD_WIDTH}px`, gap: '24px' }}>
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="bg-card border rounded-lg overflow-hidden"
                style={{ width: `${CARD_WIDTH}px` }}
              >
                <Skeleton className="w-full h-[186px]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Layout className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg text-muted-foreground mb-2">
          등록된 웰컴보드 템플릿이 없습니다.
        </p>
        {isAdmin && (
          <p className="text-sm text-muted-foreground">
            상단의 &quot;템플릿 추가&quot; 버튼을 클릭하여 새 템플릿을 만들어보세요.
          </p>
        )}
      </div>
    )
  }

  return (
    <Flipper flipKey={flipKey}>
      <div ref={containerRef} className="masonry-container justify-center md:justify-start">
        {columns.map((column, columnIndex) => (
          <div 
            key={columnIndex} 
            className="masonry-column" 
            style={{ flex: `0 0 ${CARD_WIDTH}px`, width: `${CARD_WIDTH}px`, gap: '24px' }}
          >
            {column.map((template) => (
              <Flipped key={template.id} flipId={template.id}>
                <div
                  className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                  style={{ width: `${CARD_WIDTH}px` }}
                >
                  {/* 썸네일 - 템플릿 미리보기 (요소 포함) */}
                  <div className="relative w-full h-[186px] bg-muted overflow-hidden">
                    {template.backgroundUrl ? (
                      <div className="pointer-events-none">
                        <WelcomeBoardCanvas
                          template={template}
                          userEditData={defaultUserEditData}
                          scale={186 / template.height}
                          showEditHighlight={false}
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Layout className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}

                    {/* 오버레이 - 선택 버튼 */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectTemplate(template)}
                      >
                        편집하기
                      </Button>
                    </div>
                  </div>

                  {/* 템플릿 정보 */}
                  <div className="p-3">
                    <h3 className="font-semibold truncate text-sm">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.width} x {template.height}px
                    </p>
                  </div>

                  {/* 관리자 액션 버튼 */}
                  {isAdmin && (onEditTemplate || onDeleteTemplate) && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      {onEditTemplate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditTemplate(template)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {onDeleteTemplate && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteTemplate(template.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Flipped>
            ))}
          </div>
        ))}
      </div>
    </Flipper>
  )
}
