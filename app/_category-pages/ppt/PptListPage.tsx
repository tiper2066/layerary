'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PptUploadDialog } from '@/components/category-pages/PptCategory/PptUploadDialog'
import { PptCard } from '@/components/category-pages/PptCategory/PptCard'
import { PptPropertyPanel } from '@/components/category-pages/PptCategory/PptPropertyPanel'
import { PptZipSection } from '@/components/category-pages/PptCategory/PptZipSection'
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

interface Category {
  id: string
  name: string
  slug: string
  type: string
  pageType?: string | null
}

interface PptListPageProps {
  category: Category
}

interface Post {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  images?: Array<{ url: string; name: string; order: number }> | null | any
  fileUrl?: string
  concept?: string | null // 타입 (가로, 세로)
  tool?: string | null // 언어 (EN, KR, JP)
  producedAt?: Date | null
}

// PPT 카드 고정 너비
const PPT_CARD_WIDTH = 320

export function PptListPage({ category }: PptListPageProps) {
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
  const [columns, setColumns] = useState<Post[][]>([])

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitialMountRef = useRef(true)
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
          limit: '20',
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
    isInitialMountRef.current = false
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

  // postId 파라미터 감지하여 게시물 자동 선택
  useEffect(() => {
    const postIdParam = searchParams.get('postId')
    if (postIdParam && posts.length > 0) {
      const post = posts.find((p) => p.id === postIdParam)
      if (post) {
        setSelectedPostId(postIdParam)
        setSelectedPost(post)
        router.replace(`/${category.slug}`, { scroll: false })
      }
    }
  }, [searchParams, posts, category.slug, router])

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    if (page > 1 && !loading && !fetchInProgressRef.current && hasMore) {
      fetchPosts(page, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchPosts, hasMore])

  // 컨테이너 너비에 따라 열 개수 계산 (masonry 레이아웃)
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const cardWidth = PPT_CARD_WIDTH
    const gap = 8
    
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
    
    const newColumns: Post[][] = Array(numColumns).fill(null).map(() => [])
    
    posts.forEach((post) => {
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

  // Flipper의 flipKey
  const flipKey = columns.length > 0 
    ? `ppt:${columns.map((col, idx) => `${idx}:${col.map(p => p.id).join(',')}`).join('|')}`
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
  const handleDownload = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || !post.fileUrl) return

    try {
      const proxyUrl = `/api/posts/files?url=${encodeURIComponent(post.fileUrl)}`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 파일명 생성: 제목_언어_제작일.ppt(x)
      let fileName = post.title
      if (post.tool) {
        fileName += `_${post.tool}`
      }
      if (post.producedAt) {
        const date = new Date(post.producedAt)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        fileName += `_${year}${month}${day}`
      }
      // 파일 확장자 추출
      const fileUrl = post.fileUrl || ''
      const extension = fileUrl.toLowerCase().endsWith('.pptx') ? 'pptx' : 'ppt'
      a.download = `${fileName}.${extension}`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('[PptListPage] Download error:', error)
      alert('다운로드 중 오류가 발생했습니다.')
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

      setPosts((prev) => prev.filter((p) => p.id !== deletePostId))
      
      if (selectedPostId === deletePostId) {
        setSelectedPostId(null)
        setSelectedPost(null)
      }

      setDeleteDialogOpen(false)
      setDeletePostId(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
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

  // fileUrl 추출 헬퍼 함수
  const getFileUrl = (post: Post): string | null => {
    if (post.fileUrl) return post.fileUrl
    
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
                <Plus className="h-4 w-4" />
                게시물 추가
              </Button>
            )}
          </div>

          {/* ZIP 파일 섹션 (필터 메뉴 대신) */}
          <div className="mb-6">
            <PptZipSection categorySlug={category.slug} />
          </div>

          {/* 로딩 중 Skeleton 표시 */}
          {loading && posts.length === 0 && (
            <div ref={containerRef} className="masonry-container justify-center md:justify-start">
              {Array.from({ length: Math.min(4, Math.max(1, Math.floor((containerRef.current?.offsetWidth || 1200) / (PPT_CARD_WIDTH + 8)))) }).map((_, colIndex) => (
                <div key={colIndex} className="masonry-column" style={{ flex: `0 0 ${PPT_CARD_WIDTH}px`, width: `${PPT_CARD_WIDTH}px`, gap: '8px' }}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <PostCardSkeleton key={index} width={PPT_CARD_WIDTH} height={230} showButtons={true} />
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
                  <Plus className="h-4 w-4" />
                  첫 게시물 추가하기
                </Button>
              )}
            </div>
          )}

          {/* 게시물 목록 */}
          {posts.length > 0 && (
            <Flipper flipKey={flipKey}>
              <div ref={containerRef} className="masonry-container justify-center md:justify-start">
                {columns.map((column, colIndex) => (
                  <div
                    key={colIndex}
                    className="masonry-column"
                    style={{ flex: `0 0 ${PPT_CARD_WIDTH}px`, width: `${PPT_CARD_WIDTH}px`, gap: '8px' }}
                  >
                    {column.map((post) => {
                      const fileUrl = getFileUrl(post)
                      return (
                        <Flipped key={post.id} flipId={post.id}>
                          <div>
                            <PptCard
                              post={{
                                ...post,
                                fileUrl,
                              }}
                              isSelected={selectedPostId === post.id}
                              onClick={handlePostClick}
                              onEdit={isAdmin ? handleEdit : undefined}
                              onDelete={isAdmin ? handleDeleteClick : undefined}
                              showActions={isAdmin}
                            />
                          </div>
                        </Flipped>
                      )
                    })}
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
      </div>

      {/* 우측: 속성 패널 */}
      <PptPropertyPanel
        post={selectedPost}
        onDownload={handleDownload}
      />

      {/* 업로드 다이얼로그 */}
      <PptUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
        categoryId={category.id}
        categorySlug={category.slug}
      />

      {/* 수정 다이얼로그 */}
      {editPost && (
        <PptUploadDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false)
            setEditPostId(null)
            setEditPost(null)
          }}
          onSuccess={handleUploadSuccess}
          categoryId={category.id}
          categorySlug={category.slug}
          postId={editPostId || undefined}
          initialData={{
            title: editPost.title,
            description: editPost.description,
            concept: editPost.concept,
            tool: editPost.tool,
            producedAt: editPost.producedAt,
            fileUrl: getFileUrl(editPost),
            thumbnailUrl: editPost.thumbnailUrl,
          }}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
