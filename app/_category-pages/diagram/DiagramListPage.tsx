'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { DiagramCard } from '@/components/category-pages/DiagramCategory/DiagramCard'
import { DiagramZipSection } from '@/components/category-pages/DiagramCategory/DiagramZipSection'
import { Flipper, Flipped } from 'react-flip-toolkit'
import { PostCardSkeleton } from '@/components/ui/post-card-skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Diagram {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  width: number
  height: number
  createdAt: Date
  updatedAt: Date
}

// 다이어그램 카드 고정 너비
const DIAGRAM_CARD_WIDTH = 320

export function DiagramListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDiagramId, setDeletingDiagramId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [columns, setColumns] = useState<Diagram[][]>([])

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()
  const fetchInProgressRef = useRef(false)

  // 무한 스크롤 구현
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading])

  // 다이어그램 목록 조회
  const fetchDiagrams = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (fetchInProgressRef.current || loading) {
        return
      }

      fetchInProgressRef.current = true
      try {
        setLoading(true)

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
        })

        const response = await fetch(`/api/diagrams?${params.toString()}`)

        if (!response.ok) {
          setHasMore(false)
          throw new Error('다이어그램 목록을 불러오는데 실패했습니다.')
        }

        const data = await response.json()

        if (append) {
          setDiagrams((prev) => {
            const existingIds = new Set(prev.map((d) => d.id))
            const newDiagrams = data.diagrams.filter((d: Diagram) => !existingIds.has(d.id))
            return [...prev, ...newDiagrams]
          })
        } else {
          setDiagrams(data.diagrams)
        }

        setHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('Error fetching diagrams:', error)
        setHasMore(false)
      } finally {
        setLoading(false)
        fetchInProgressRef.current = false
      }
    },
    [loading]
  )

  // 초기 로드
  useEffect(() => {
    fetchDiagrams(1, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    if (page > 1 && !loading && !fetchInProgressRef.current && hasMore) {
      fetchDiagrams(page, true)
    }
  }, [page, fetchDiagrams, hasMore, loading])

  // 컨테이너 너비에 따라 열 개수 계산 (masonry 레이아웃)
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const cardWidth = DIAGRAM_CARD_WIDTH
    const gap = 8
    
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
    
    const newColumns: Diagram[][] = Array(numColumns).fill(null).map(() => [])
    
    diagrams.forEach((diagram) => {
      const shortestColumnIndex = newColumns.reduce((minIndex, column, i) => {
        return column.length < newColumns[minIndex].length ? i : minIndex
      }, 0)
      newColumns[shortestColumnIndex].push(diagram)
    })
    
    setColumns(newColumns)
  }, [diagrams])

  // 컬럼 계산 및 리사이즈 핸들러
  useEffect(() => {
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
  }, [calculateColumns])

  // Flipper의 flipKey
  const flipKey = columns.length > 0 
    ? `diagram:${columns.map((col, idx) => `${idx}:${col.map(d => d.id).join(',')}`).join('|')}`
    : 'empty'

  // 새 다이어그램 생성
  const handleCreateNew = () => {
    router.push('/diagram/editor')
  }

  // 다이어그램 편집
  const handleEdit = (diagramId: string) => {
    router.push(`/diagram/${diagramId}`)
  }

  // 다이어그램 삭제 확인
  const handleDeleteClick = (diagramId: string) => {
    setDeletingDiagramId(diagramId)
    setDeleteDialogOpen(true)
  }

  // 다이어그램 삭제 실행
  const confirmDelete = async () => {
    if (!deletingDiagramId) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/diagrams/${deletingDiagramId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.')
      }

      setDiagrams((prev) => prev.filter((d) => d.id !== deletingDiagramId))
      setDeleteDialogOpen(false)
      setDeletingDiagramId(null)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="pb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold">다이어그램</h1>
            <p className="text-muted-foreground mt-2">
              도형과 텍스트를 이용하여 나만의 다이어그램을 만들고 다양한 포맷으로 내보내세요.<br />
              <sub>기본 다이어그램 템플릿을 다운받아 이미 만들어진 다양한 다이어그램을 편집하여 사용할 수 있습니다.</sub>
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            다이어그램 추가
          </Button>
        </div>

        {/* ZIP 파일 섹션 (PPT 페이지와 동일 구조) */}
        <div className="mb-6">
          <DiagramZipSection />
        </div>

        {/* 로딩 중 Skeleton 표시 */}
        {loading && diagrams.length === 0 && (
          <div ref={containerRef} className="masonry-container justify-center md:justify-start">
            {Array.from({ length: Math.min(4, Math.max(1, Math.floor((containerRef.current?.offsetWidth || 1200) / (DIAGRAM_CARD_WIDTH + 8)))) }).map((_, colIndex) => (
              <div key={colIndex} className="masonry-column" style={{ flex: `0 0 ${DIAGRAM_CARD_WIDTH}px`, width: `${DIAGRAM_CARD_WIDTH}px`, gap: '8px' }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <PostCardSkeleton key={index} width={DIAGRAM_CARD_WIDTH} height={230} showButtons={true} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 다이어그램이 없을 때 */}
        {diagrams.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              아직 만든 다이어그램이 없습니다.
            </p>
            <Button onClick={handleCreateNew}>
              첫 다이어그램 만들기
            </Button>
          </div>
        )}

        {/* 다이어그램 그리드 (Masonry 레이아웃) */}
        {diagrams.length > 0 && (
          <Flipper flipKey={flipKey}>
            <div ref={containerRef} className="masonry-container justify-center md:justify-start">
              {columns.map((column, colIndex) => (
                <div
                  key={colIndex}
                  className="masonry-column"
                  style={{ flex: `0 0 ${DIAGRAM_CARD_WIDTH}px`, width: `${DIAGRAM_CARD_WIDTH}px`, gap: '8px' }}
                >
                  {column.map((diagram) => (
                    <Flipped key={diagram.id} flipId={diagram.id}>
                      <div>
                        <DiagramCard
                          diagram={diagram}
                          onEdit={() => handleEdit(diagram.id)}
                          onDelete={() => handleDeleteClick(diagram.id)}
                        />
                      </div>
                    </Flipped>
                  ))}
                </div>
              ))}
            </div>
          </Flipper>
        )}

        {/* 무한 스크롤 트리거 */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center items-center py-8">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">더 불러오는 중...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>다이어그램 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 다이어그램을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
