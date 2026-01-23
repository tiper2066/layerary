'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Download, Loader2, Search, Trash2, CheckSquare, Square } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { IconUploadDialog } from '@/components/category-pages/IconCategory/IconUploadDialog'
import { IconCard } from '@/components/category-pages/IconCategory/IconCard'
import { IconPropertyPanel, DEFAULT_COLOR, DEFAULT_STROKE_WIDTH, DEFAULT_SIZE } from '@/components/category-pages/IconCategory/IconPropertyPanel'
import { changeIconSvgProperties } from '@/lib/svg-utils'
import JSZip from 'jszip'
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

interface Category {
  id: string
  name: string
  slug: string
  type: string
  pageType?: string | null
}

interface IconListPageProps {
  category: Category
}

interface Post {
  id: string
  title: string
  fileUrl?: string | null
  thumbnailUrl?: string | null
}

export function IconListPage({ category }: IconListPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // 속성 상태
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH)
  const [size, setSize] = useState(DEFAULT_SIZE)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const fetchInProgressRef = useRef(false)

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    
    // 파일명 추출 헬퍼 함수
    const getFileName = (url: string | null | undefined): string => {
      if (!url) return ''
      // URL에서 파일명 추출 (확장자 포함)
      const fileName = url.split('/').pop() || ''
      // 확장자 제거한 파일명도 반환
      const nameWithoutExt = fileName.replace(/\.(svg|png|jpg|jpeg)$/i, '')
      return nameWithoutExt.toLowerCase()
    }
    
    const filtered = posts.filter((post) => {
      // 제목으로 검색
      const titleMatch = post.title.toLowerCase().includes(query)
      
      // 파일명으로 검색 (확장자 포함/제외 모두)
      const fileName = getFileName(post.fileUrl)
      const fileMatch = fileName.includes(query) || 
                       post.fileUrl?.toLowerCase().includes(query)
      
      return titleMatch || fileMatch
    })
    
    setFilteredPosts(filtered)
  }, [posts, searchQuery])

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

  // 게시물 목록 조회
  const fetchPosts = useCallback(
    async (pageNum: number, append: boolean = false, forceRefresh: boolean = false) => {
      if (fetchInProgressRef.current || loading) {
        return
      }
      
      fetchInProgressRef.current = true
      try {
        setLoading(true)
        
        const params = new URLSearchParams({
          categorySlug: category.slug,
          page: pageNum.toString(),
          limit: '50', // 아이콘은 작으므로 더 많이 로드
        })
        
        if (forceRefresh) {
          params.append('_t', Date.now().toString())
        }
        
        const response = await fetch(`/api/posts?${params.toString()}`, {
          cache: forceRefresh ? 'no-store' : 'default',
        })

        if (!response.ok) {
          setHasMore(false)
          throw new Error('게시물 목록을 불러오는데 실패했습니다.')
        }

        const data = await response.json()

        if (append) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map(p => p.id))
            const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.id))
            return [...prev, ...newPosts]
          })
        } else {
          setPosts(data.posts)
        }

        setHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('Error fetching posts:', error)
        setHasMore(false)
      } finally {
        setLoading(false)
        fetchInProgressRef.current = false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category.slug]
  )

  // 초기 로드
  useEffect(() => {
    fetchPosts(1, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 새로고침 파라미터 감지
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      setPage(1)
      setPosts([])
      fetchPosts(1, false, true)
      router.replace(`/${category.slug}`, { scroll: false })
    }
  }, [searchParams, fetchPosts, category.slug, router])

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    if (page > 1 && !loading && !fetchInProgressRef.current && hasMore) {
      fetchPosts(page, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchPosts, hasMore])

  // 아이콘 선택/해제
  const handleIconClick = (postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedPostIds.size === filteredPosts.length) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(filteredPosts.map(p => p.id)))
    }
  }

  // 선택된 아이콘 삭제
  const handleDelete = async () => {
    if (selectedPostIds.size === 0) {
      alert('삭제할 아이콘을 선택해주세요.')
      return
    }

    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedPostIds.size === 0) return

    try {
      setDeleting(true)

      const selectedIds = Array.from(selectedPostIds)
      let successCount = 0
      let failCount = 0

      // 각 아이콘 삭제
      for (const postId of selectedIds) {
        try {
          const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('삭제에 실패했습니다.')
          }

          successCount++
        } catch (error) {
          console.error(`Failed to delete post ${postId}:`, error)
          failCount++
        }
      }

      // 목록에서 제거
      setPosts((prev) => prev.filter((p) => !selectedPostIds.has(p.id)))
      setSelectedPostIds(new Set())

      setDeleteDialogOpen(false)

      if (failCount > 0) {
        alert(`${successCount}개 삭제 성공, ${failCount}개 삭제 실패`)
      } else {
        alert(`${successCount}개의 아이콘이 삭제되었습니다.`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  // 속성 리셋
  const handleReset = () => {
    setColor(DEFAULT_COLOR)
    setStrokeWidth(DEFAULT_STROKE_WIDTH)
    setSize(DEFAULT_SIZE)
  }

  // 속성 패널용 다운로드 (단일/다중 모두 처리)
  const handlePropertyPanelDownload = async (format: 'png' | 'jpg' | 'svg') => {
    if (selectedPostIds.size === 0) {
      alert('다운로드할 아이콘을 선택해주세요.')
      return
    }

    try {
      setDownloading(true)

      const selectedPosts = posts.filter((p) => selectedPostIds.has(p.id))

      // 단일 아이콘 다운로드
      if (selectedPosts.length === 1) {
        const post = selectedPosts[0]
        if (!post.fileUrl || !post.id) {
          alert('다운로드할 파일이 없습니다.')
          setDownloading(false)
          return
        }

        // SVG 포맷인 경우 클라이언트 사이드 처리
        if (format === 'svg') {
          try {
            const response = await fetch(post.fileUrl)
            if (!response.ok) throw new Error(`Failed to fetch ${post.title}`)
            
            let svgContent = await response.text()
            
            // 속성 적용
            svgContent = changeIconSvgProperties(svgContent, color, strokeWidth, size)
            
            // 파일명 생성
            const fileName = `${post.title}.svg`
            
            // 직접 다운로드
            const blob = new Blob([svgContent], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          } catch (error) {
            console.error(`Error downloading ${post.title}:`, error)
            alert('다운로드 중 오류가 발생했습니다.')
          }
        } else {
          // PNG/JPG 포맷인 경우 API 호출
          try {
            const queryParams = new URLSearchParams({
              format,
              size: size.toString(),
              color,
              strokeWidth: strokeWidth.toString(),
            })

            const response = await fetch(
              `/api/posts/${post.id}/icon/download?${queryParams.toString()}`
            )

            if (!response.ok) {
              const errorText = await response.text()
              console.error('[IconListPage] 다운로드 에러 응답:', errorText)
              throw new Error('다운로드에 실패했습니다.')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            
            // 파일명 생성
            const fileName = `${post.title}.${format}`
            a.download = fileName
            
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } catch (error) {
            console.error('[IconListPage] Download error:', error)
            alert('다운로드 중 오류가 발생했습니다.')
          }
        }
      } else {
        // 여러 아이콘 ZIP 다운로드 (SVG만 지원)
        const zip = new JSZip()

        // 각 SVG 파일 다운로드 및 속성 적용
        for (const post of selectedPosts) {
          if (!post.fileUrl) continue

          try {
            // SVG 파일 가져오기
            const response = await fetch(post.fileUrl)
            if (!response.ok) throw new Error(`Failed to fetch ${post.title}`)
            
            let svgContent = await response.text()
            
            // 속성 적용
            svgContent = changeIconSvgProperties(svgContent, color, strokeWidth, size)
            
            // 파일명 생성 (확장자 포함)
            const fileName = `${post.title}.svg`
            
            // ZIP에 추가
            zip.file(fileName, svgContent)
          } catch (error) {
            console.error(`Error processing ${post.title}:`, error)
            // 개별 파일 실패해도 계속 진행
          }
        }

        // ZIP 파일 생성 및 다운로드
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `icons_${Date.now()}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  // 업로드 성공 핸들러
  const handleUploadSuccess = () => {
    setPage(1)
    setHasMore(true)
    setPosts([])
    fetchPosts(1, false, true)
    router.refresh()
  }

  // 표시 크기 계산 (16-56px 제한)
  const displaySize = Math.min(size, 56)

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900">
      {/* 좌측: 게시물 목록 */}
      <div className="flex-1 pr-[410px] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex-none px-8 pt-16 pb-4 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {isAdmin && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                아이콘 추가
              </Button>
            )}
          </div>

          {/* 검색 및 액션 버튼 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`아이콘 이름으로 검색... (총 ${posts.length} icons)`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* 전체 선택/해제 버튼 - 모든 사용자 사용 가능 */}
            {filteredPosts.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSelectAll}
                disabled={deleting}
              >
                {selectedPostIds.size === filteredPosts.length ? (
                  <>
                    <Square className="h-4 w-4" />
                    전체 해제
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    전체 선택
                  </>
                )}
              </Button>
            )}


            {/* 관리자용 삭제 버튼 */}
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || selectedPostIds.size === 0}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    삭제 {selectedPostIds.size > 0 && `(${selectedPostIds.size})`}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 아이콘 그리드 */}
        <div className="px-8 py-6">
          {filteredPosts.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다.' : '아이콘이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-3">
              {filteredPosts.map((post) => (
                <IconCard
                  key={post.id}
                  post={post}
                  isSelected={selectedPostIds.has(post.id)}
                  onClick={handleIconClick}
                  size={displaySize}
                  color={color}
                  strokeWidth={strokeWidth}
                />
              ))}
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>더 불러오는 중...</span>
                </div>
              ) : (
                <div className="h-8" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 속성 패널 */}
      <IconPropertyPanel
        color={color}
        strokeWidth={strokeWidth}
        size={size}
        selectedCount={selectedPostIds.size}
        onColorChange={setColor}
        onStrokeWidthChange={setStrokeWidth}
        onSizeChange={setSize}
        onReset={handleReset}
        onDownload={handlePropertyPanelDownload}
      />

      {/* 업로드 다이얼로그 */}
      {isAdmin && (
        <IconUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          onSuccess={handleUploadSuccess}
          categoryId={category.id}
          categorySlug={category.slug}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>아이콘 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedPostIds.size}개의 아이콘을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
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
