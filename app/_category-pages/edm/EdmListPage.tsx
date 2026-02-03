'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { EdmCard } from '@/components/category-pages/EdmCategory/EdmCard'
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

interface Edm {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  imageWidth: number
  imageHeight: number
  createdAt: Date
  updatedAt: Date
}

const EDM_CARD_WIDTH = 320

export function EdmListPage() {
  const router = useRouter()
  const [edms, setEdms] = useState<Edm[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingEdmId, setDeletingEdmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [columns, setColumns] = useState<Edm[][]>([])

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()
  const fetchInProgressRef = useRef(false)

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
    return () => observer.disconnect()
  }, [hasMore, loading])

  const fetchEdms = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (fetchInProgressRef.current || loading) return

      fetchInProgressRef.current = true
      try {
        setLoading(true)

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
        })

        const response = await fetch(`/api/edm?${params.toString()}`)

        if (!response.ok) {
          setHasMore(false)
          throw new Error('eDM 목록을 불러오는데 실패했습니다.')
        }

        const data = await response.json()

        if (append) {
          setEdms((prev) => {
            const existingIds = new Set(prev.map((e) => e.id))
            const newEdms = data.edms.filter((e: Edm) => !existingIds.has(e.id))
            return [...prev, ...newEdms]
          })
        } else {
          setEdms(data.edms)
        }

        setHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('Error fetching edms:', error)
        setHasMore(false)
      } finally {
        setLoading(false)
        fetchInProgressRef.current = false
      }
    },
    [loading]
  )

  useEffect(() => {
    fetchEdms(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (page > 1 && !loading && !fetchInProgressRef.current && hasMore) {
      fetchEdms(page, true)
    }
  }, [page, fetchEdms, hasMore, loading])

  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const cardWidth = EDM_CARD_WIDTH
    const gap = 8
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
    const newColumns: Edm[][] = Array(numColumns)
      .fill(null)
      .map(() => [])

    edms.forEach((edm) => {
      const shortestColumnIndex = newColumns.reduce(
        (minIndex, column, i) => (column.length < newColumns[minIndex].length ? i : minIndex),
        0
      )
      newColumns[shortestColumnIndex].push(edm)
    })

    setColumns(newColumns)
  }, [edms])

  useEffect(() => {
    calculateColumns()

    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(calculateColumns, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [calculateColumns])

  const flipKey =
    columns.length > 0
      ? `edm:${columns.map((col, idx) => `${idx}:${col.map((e) => e.id).join(',')}`).join('|')}`
      : 'empty'

  const handleCreateNew = () => router.push('/edm/editor')
  const handleEdit = (edmId: string) => router.push(`/edm/${edmId}`)
  const handleDeleteClick = (edmId: string) => {
    setDeletingEdmId(edmId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingEdmId) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/edm/${deletingEdmId}`, { method: 'DELETE' })

      if (!response.ok) throw new Error('삭제에 실패했습니다.')

      setEdms((prev) => prev.filter((e) => e.id !== deletingEdmId))
      setDeleteDialogOpen(false)
      setDeletingEdmId(null)
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
            <h1 className="text-3xl font-bold">eDM Code Generator</h1>
            <p className="text-muted-foreground mt-2">
              이미지는 그리드를 기준으로 분할되며 그리드 추가, 삭제, 이동 등 편집이 가능합니다.
              <br />
              <sub>셀을 드래그하여 선택한 후 병합하면 이미지 갯수를 최소화 할 수 있습니다.</sub>
            </p>
          </div>
          <Button onClick={handleCreateNew}>eDM 추가</Button>
        </div>

        {loading && edms.length === 0 && (
          <div ref={containerRef} className="masonry-container justify-center md:justify-start">
            {Array.from({
              length: Math.min(
                4,
                Math.max(1, Math.floor((containerRef.current?.offsetWidth || 1200) / (EDM_CARD_WIDTH + 8)))
              ),
            }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="masonry-column"
                style={{
                  flex: `0 0 ${EDM_CARD_WIDTH}px`,
                  width: `${EDM_CARD_WIDTH}px`,
                  gap: '8px',
                }}
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <PostCardSkeleton
                    key={index}
                    width={EDM_CARD_WIDTH}
                    height={230}
                    showButtons={true}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {edms.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground mb-4">아직 만든 eDM이 없습니다.</p>
            <Button onClick={handleCreateNew}>첫 eDM 만들기</Button>
          </div>
        )}

        {edms.length > 0 && (
          <Flipper flipKey={flipKey}>
            <div ref={containerRef} className="masonry-container justify-center md:justify-start">
              {columns.map((column, colIndex) => (
                <div
                  key={colIndex}
                  className="masonry-column"
                  style={{
                    flex: `0 0 ${EDM_CARD_WIDTH}px`,
                    width: `${EDM_CARD_WIDTH}px`,
                    gap: '8px',
                  }}
                >
                  {column.map((edm) => (
                    <Flipped key={edm.id} flipId={edm.id}>
                      <div>
                        <EdmCard
                          edm={edm}
                          onEdit={() => handleEdit(edm.id)}
                          onDelete={() => handleDeleteClick(edm.id)}
                        />
                      </div>
                    </Flipped>
                  ))}
                </div>
              ))}
            </div>
          </Flipper>
        )}

        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center items-center py-8">
            {loading && (
              <div className="flex gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">더 불러오는 중...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>eDM 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 eDM을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
