'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { CloudbricUploadDialog } from '@/components/category-pages/CloudbricCategory/CloudbricUploadDialog'
import { CloudbricCard } from '@/components/category-pages/CloudbricCategory/CloudbricCard'
import { CloudbricPropertyPanel } from '@/components/category-pages/CloudbricCategory/CloudbricPropertyPanel'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
  type: string
  pageType?: string | null
}

interface CloudbricListPageProps {
  category: Category
}

interface Post {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  images?: Array<{ url: string; name: string; order: number }> | null | any
  fileUrl?: string
  concept?: string | null // 타입 (Cloudbric, WAF+ 등)
  tool?: string | null // 언어 (EN, KR, JP)
  producedAt?: Date | null
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>
}

// ****************************************************************************** Cloudbric 카드 고정 너비 (이 값만 수정하면 됨)
const CLOUDBRIC_CARD_WIDTH = 320

const CLOUDBRIC_FILTERS = [
  'ALL',
  'Cloudbric',
  'WAF+',
  'WMS',
  'Managed Rules',
  'RAS',
  'PAS',
]

export function CloudbricListPage({ category }: CloudbricListPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [posts, setPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL') // 필터 상태
  const [columns, setColumns] = useState<Post[][]>([])
  // 하이브리드 캐싱: 최근 3개 필터의 데이터를 메모리에 저장 (useRef 사용으로 무한 루프 방지)
  const filterCacheRef = useRef<Record<string, Post[]>>({})
  const filterCacheOrderRef = useRef<string[]>([]) // 캐시 순서 추적 (LRU 방식)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitialMountRef = useRef(true) // 초기 마운트 플래그
  const fetchInProgressRef = useRef(false) // fetch 진행 중 플래그

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

  // 게시물 목록 조회 (selectedFilter를 파라미터로 받도록 변경)
  const fetchPosts = useCallback(
    async (pageNum: number, filter: string, append: boolean = false, forceRefresh: boolean = false) => {
      // 중복 호출 방지 (loading 상태와 fetchInProgressRef 모두 확인)
      if (fetchInProgressRef.current || loading) {
        return
      }
      
      fetchInProgressRef.current = true
      try {
        setLoading(true)
        
        // 필터 파라미터 구성
        const params = new URLSearchParams({
          categorySlug: category.slug,
          page: pageNum.toString(),
          limit: '20',
        })
        
        // 필터 적용 (concept 파라미터 사용)
        if (filter !== 'ALL') {
          params.append('concept', filter)
        }
        
        if (forceRefresh) {
          params.append('_t', Date.now().toString())
        }
        
        const response = await fetch(`/api/posts?${params.toString()}`, {
          cache: forceRefresh ? 'no-store' : 'default',
        })

        if (!response.ok) {
          // 에러 발생 시 더 이상 로드하지 않도록 설정
          setHasMore(false)
          throw new Error('게시물 목록을 불러오는데 실패했습니다.')
        }

        const data = await response.json()

        if (append) {
          setPosts((prev) => {
            // 중복 제거: 이미 존재하는 post.id는 추가하지 않음
            const existingIds = new Set(prev.map(p => p.id))
            const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.id))
            return [...prev, ...newPosts]
          })
        } else {
          setPosts(data.posts)
          
          // 캐시 저장 (최근 3개 필터만 유지 - LRU 방식)
          if (!append && pageNum === 1) {
            filterCacheRef.current[filter] = data.posts
            
            // 최근 사용한 필터 순서 업데이트
            const order = filterCacheOrderRef.current.filter((f) => f !== filter)
            order.unshift(filter) // 맨 앞에 추가
            
            // 최근 3개만 유지
            if (order.length > 3) {
              const removed = order.pop()
              if (removed) {
                delete filterCacheRef.current[removed]
              }
            }
            
            filterCacheOrderRef.current = order
          }
        }

        setHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('Error fetching posts:', error)
        // 에러 발생 시 더 이상 로드하지 않도록 설정
        setHasMore(false)
      } finally {
        setLoading(false)
        fetchInProgressRef.current = false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category.slug] // loading은 내부에서 관리되므로 의존성에서 제외
  )

  // 필터 변경 시 목록 새로고침 및 선택 상태 초기화
  useEffect(() => {
    // 초기 마운트 시에는 실행하지 않음 (초기 로드 useEffect가 처리)
    if (isInitialMountRef.current) {
      return
    }
    
    setPage(1)
    // 선택 상태 초기화
    setSelectedPostId(null)
    setSelectedPost(null)
    
    // 하이브리드 캐싱: 캐시된 데이터가 있으면 즉시 표시
    if (filterCacheRef.current[selectedFilter] && filterCacheRef.current[selectedFilter].length > 0) {
      setPosts(filterCacheRef.current[selectedFilter])
      // 백그라운드에서 최신 데이터 확인 (브라우저 캐시 활용)
      fetchPosts(1, selectedFilter, false, false)
    } else {
      // 캐시가 없으면 로딩 표시 후 API 호출
      setPosts([])
      fetchPosts(1, selectedFilter, false, false)
    }
  }, [selectedFilter, fetchPosts]) // filterCache 의존성 제거 (무한 루프 방지)

  // 초기 로드 (마운트 시에만 실행)
  useEffect(() => {
    fetchPosts(1, 'ALL', false)
    isInitialMountRef.current = false // 초기 마운트 완료 표시
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 새로고침 파라미터 감지
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      // 모든 캐시 무효화
      filterCacheRef.current = {}
      filterCacheOrderRef.current = []
      
      setPage(1)
      // setHasMore(true) 제거 - fetchPosts에서 API 응답의 실제 hasMore 값을 설정함
      setPosts([]) // 기존 게시물 초기화
      fetchPosts(1, selectedFilter, false, true)
      router.replace(`/${category.slug}`, { scroll: false })
    }
  }, [searchParams, selectedFilter, fetchPosts, category.slug, router])

  // postId 파라미터 감지하여 게시물 자동 선택
  useEffect(() => {
    const postIdParam = searchParams.get('postId')
    if (postIdParam && posts.length > 0) {
      const post = posts.find((p) => p.id === postIdParam)
      if (post) {
        setSelectedPostId(postIdParam)
        setSelectedPost(post)
        // URL에서 postId 파라미터 제거 (선택적으로)
        router.replace(`/${category.slug}`, { scroll: false })
      }
    }
  }, [searchParams, posts, category.slug, router])

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    // page가 1보다 크고, 현재 로딩 중이 아니고, fetch가 진행 중이 아니며, hasMore가 true일 때만 실행
    if (page > 1 && !loading && !fetchInProgressRef.current && hasMore) {
      fetchPosts(page, selectedFilter, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedFilter, fetchPosts, hasMore]) // loading은 fetchPosts 내부에서 관리되므로 의존성에서 제외

  // 컨테이너 너비에 따라 열 개수 계산 (masonry 레이아웃)
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const cardWidth = CLOUDBRIC_CARD_WIDTH
    const gap = 8 // gap-2 = 8px
    
    // 열 개수 계산: (사용 가능 너비 + gap) / (카드 너비 + gap)
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
    
    // 각 열에 카드 분배
    const newColumns: Post[][] = Array(numColumns).fill(null).map(() => [])
    
    posts.forEach((post) => {
      // 가장 짧은 열에 카드 추가 (Pinterest 스타일)
      const shortestColumnIndex = newColumns.reduce((minIndex, column, i) => {
        return column.length < newColumns[minIndex].length ? i : minIndex
      }, 0)
      newColumns[shortestColumnIndex].push(post)
    })
    
    setColumns(newColumns)
  }, [posts])

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

  // Flipper의 flipKey는 columns 구조가 변경될 때마다 업데이트되어 애니메이션 트리거
  const flipKey = columns.length > 0 
    ? `${selectedFilter}:${columns.map((col, idx) => `${idx}:${col.map(p => p.id).join(',')}`).join('|')}`
    : 'empty'

  // 게시물 선택
  const handlePostClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (post) {
      setSelectedPostId(postId)
      setSelectedPost(post)
    }
  }

  // 다운로드
  const handleDownload = async () => {
    if (!selectedPost || !selectedPost.fileUrl) return

    try {
      // 프록시를 통해 PDF 다운로드
      const proxyUrl = `/api/posts/files?url=${encodeURIComponent(selectedPost.fileUrl)}`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 파일명 생성: 제목_언어_제작일.pdf
      let fileName = selectedPost.title
      if (selectedPost.tool) {
        fileName += `_${selectedPost.tool}`
      }
      if (selectedPost.producedAt) {
        const date = new Date(selectedPost.producedAt)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        fileName += `_${year}${month}${day}`
      }
      a.download = `${fileName}.pdf`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('[CloudbricListPage] Download error:', error)
      toast.error('다운로드 중 오류가 발생했습니다.')
    }
  }

  // 수정
  const handleEdit = (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (post) {
      setEditPostId(postId)
      setEditPost(post)
      setEditDialogOpen(true)
    }
  }

  // 삭제
  const handleDeleteClick = (postId: string) => {
    setDeletePostId(postId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletePostId) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/posts/${deletePostId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.')
      }

      // 목록에서 제거
      setPosts((prev) => prev.filter((p) => p.id !== deletePostId))
      
      // 모든 필터 캐시에서도 제거
      Object.keys(filterCacheRef.current).forEach((filter) => {
        filterCacheRef.current[filter] = filterCacheRef.current[filter].filter((p) => p.id !== deletePostId)
      })
      
      // 선택된 게시물이 삭제된 경우 선택 해제
      if (selectedPostId === deletePostId) {
        setSelectedPostId(null)
        setSelectedPost(null)
      }

      setDeleteDialogOpen(false)
      setDeletePostId(null)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  // 업로드 성공 핸들러
  const handleUploadSuccess = () => {
    // 현재 필터의 캐시 무효화
    delete filterCacheRef.current[selectedFilter]
    filterCacheOrderRef.current = filterCacheOrderRef.current.filter((f) => f !== selectedFilter)
    
    setPage(1)
    setHasMore(true)
    setPosts([]) // 기존 게시물 초기화
    fetchPosts(1, selectedFilter, false, true) // 강제 새로고침
    router.refresh()
  }

  // fileUrl 추출 헬퍼 함수
  const getFileUrl = (post: Post): string | null => {
    if (post.fileUrl) return post.fileUrl
    
    // images 배열에서 첫 번째 파일의 URL 추출
    if (post.images) {
      let images: Array<{ url: string; name: string; order: number }> = []
      if (Array.isArray(post.images)) {
        images = post.images
      } else if (typeof post.images === 'string') {
        try {
          images = JSON.parse(post.images)
        } catch {
          images = []
        }
      }
      
      if (images.length > 0) {
        const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0))
        return sortedImages[0].url
      }
    }
    
    return null
  }

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900">
      {/* 좌측: 게시물 목록 */}
      <div className="flex-1 pr-[410px] overflow-y-auto">
        <div className="px-8 pt-16 pb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {isAdmin && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                게시물 추가
              </Button>
            )}
          </div>

          {/* 필터 메뉴 */}
          <div className="flex items-center gap-0 mb-3 flex-wrap">
            {CLOUDBRIC_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'text-primary font-semibold hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* 로딩 중 Skeleton 표시 */}
          {loading && posts.length === 0 && (
            <div ref={containerRef} className="masonry-container justify-center md:justify-start">
              {Array.from({ length: Math.min(4, Math.max(1, Math.floor((containerRef.current?.offsetWidth || 1200) / (CLOUDBRIC_CARD_WIDTH + 8)))) }).map((_, colIndex) => (
                <div key={colIndex} className="masonry-column" style={{ flex: `0 0 ${CLOUDBRIC_CARD_WIDTH}px`, width: `${CLOUDBRIC_CARD_WIDTH}px`, gap: '8px' }}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <PostCardSkeleton key={index} width={CLOUDBRIC_CARD_WIDTH} height={230} showButtons={true} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 게시물이 없을 때 빈 상태 메시지 */}
          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                등록된 게시물이 없습니다.
              </p>
              {isAdmin && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  첫 게시물 추가하기
                </Button>
              )}
            </div>
          )}

          {/* 카드 그리드 */}
          {posts.length > 0 && (
            <Flipper
              flipKey={flipKey}
              spring={{ stiffness: 160, damping: 22 }}
              staggerConfig={{
                default: {
                  speed: 0.5,
                },
              }}
              decisionData={columns}
            >
              <div ref={containerRef} className="masonry-container justify-center md:justify-start">
                {columns.map((column, columnIndex) => (
                  <div key={columnIndex} className="masonry-column" style={{ flex: `0 0 ${CLOUDBRIC_CARD_WIDTH}px`, width: `${CLOUDBRIC_CARD_WIDTH}px`, gap: '8px' }}>
                    {column.map((post) => (
                      <Flipped key={post.id} flipId={post.id}>
                        <div>
                          <CloudbricCard
                            post={{
                              ...post,
                              fileUrl: getFileUrl(post),
                            }}
                            isSelected={selectedPostId === post.id}
                            onClick={handlePostClick}
                            onEdit={isAdmin ? handleEdit : undefined}
                            onDelete={isAdmin ? handleDeleteClick : undefined}
                            showActions={isAdmin}
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
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {loading && posts.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">더 불러오는 중...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 속성 패널 */}
      <CloudbricPropertyPanel
        post={selectedPost ? {
          ...selectedPost,
          fileUrl: getFileUrl(selectedPost),
        } : null}
        onDownload={handleDownload}
      />

      {/* 업로드 다이얼로그 */}
      {isAdmin && (
        <CloudbricUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          categorySlug={category.slug}
          categoryId={category.id}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 수정 다이얼로그 */}
      {isAdmin && editPostId && editPost && (
        <CloudbricUploadDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false)
            setEditPostId(null)
            setEditPost(null)
          }}
          categorySlug={category.slug}
          categoryId={category.id}
          postId={editPostId}
          post={editPost}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!deleting) {
          setDeleteDialogOpen(open)
          if (!open) {
            setDeletePostId(null)
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
