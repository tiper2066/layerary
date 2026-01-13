'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { CiBiUploadDialog } from '@/components/category-pages/CiBiCategory/CiBiUploadDialog'
import { CiBiCard } from '@/components/category-pages/CiBiCategory/CiBiCard'
import { PropertyPanel } from '@/components/category-pages/CiBiCategory/PropertyPanel'
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

interface CiBiListPageProps {
  category: Category
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  thumbnailUrl?: string | null
  images?: Array<{ url: string; thumbnailUrl?: string; name: string; order: number }> | null | any
  fileUrl?: string
  concept?: string | null // CI/BI 타입
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>
}

export function CiBiListPage({ category }: CiBiListPageProps) {
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
  const [selectedColor, setSelectedColor] = useState<string>('#000000')
  const [selectedSize, setSelectedSize] = useState<{ width?: number; height?: number }>({})
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL') // 필터 상태

  const loadMoreRef = useRef<HTMLDivElement>(null)

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
      try {
        setLoading(true)
        
        // 필터 파라미터 구성
        const params = new URLSearchParams({
          categorySlug: category.slug,
          page: pageNum.toString(),
          limit: '20',
        })
        
        // 필터 적용
        if (selectedFilter !== 'ALL') {
          // CI 필터인 경우
          if (selectedFilter === 'CI') {
            params.append('concept', 'CI')
          } else {
            // 태그 필터인 경우 (D.AMO, WAPPLES, iSIGN, Cloudbric 등)
            params.append('tag', selectedFilter)
          }
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
          setPosts((prev) => [...prev, ...data.posts])
        } else {
          setPosts(data.posts)
        }

        setHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('Error fetching posts:', error)
        // 에러 발생 시 더 이상 로드하지 않도록 설정
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [category.slug, selectedFilter]
  )

  // 필터 변경 시 목록 새로고침 및 선택 상태 초기화
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    // 선택 상태 초기화
    setSelectedPostId(null)
    setSelectedPost(null)
    setSelectedColor('#000000')
    setSelectedSize({})
    fetchPosts(1, false, true)
  }, [selectedFilter, fetchPosts])

  // 초기 로드
  useEffect(() => {
    fetchPosts(1, false)
  }, [fetchPosts])

  // 새로고침 파라미터 감지
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      setPage(1)
      setHasMore(true)
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
        // 선택된 게시물의 타입에 따라 기본 색상 설정
        const defaultColor = post.concept === 'CI' ? 'CI_COLOR_SET' : '#000000'
        setSelectedColor(defaultColor)
        // URL에서 postId 파라미터 제거 (선택적으로)
        router.replace(`/${category.slug}`, { scroll: false })
      }
    }
  }, [searchParams, posts, category.slug, router])

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    if (page > 1) {
      fetchPosts(page, true)
    }
  }, [page, fetchPosts])

  // 게시물 선택
  const handlePostClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (post) {
      setSelectedPostId(postId)
      setSelectedPost(post)
      // 선택된 게시물의 타입에 따라 기본 색상 설정
      const defaultColor = post.concept === 'CI' ? 'CI_COLOR_SET' : '#000000'
      setSelectedColor(defaultColor)
    }
  }

  // 색상 변경
  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    // 목록에 반영 (색상 변경 시)
    // 카드 컴포넌트에서 selectedColor prop을 받아 처리
  }

  // 사이즈 변경
  const handleSizeChange = (width?: number, height?: number) => {
    setSelectedSize({ width, height })
    // 목록에는 반영하지 않음 (다운로드 시에만 사용)
  }

  // 다운로드 파일명 생성
  const generateDownloadFileName = (format: 'png' | 'jpg' | 'svg'): string => {
    if (!selectedPost) return `download.${format}`
    
    const baseName = selectedPost.title
    const postType = selectedPost.concept || 'CI'
    
    // SVG 포맷일 때는 크기 정보 없이 원본 파일명만 사용
    if (format === 'svg') {
      return `${baseName}.svg`
    }
    
    // PNG/JPG 포맷일 때는 크기 정보 포함
    const width = selectedSize.width ? Math.round(selectedSize.width) : undefined
    const height = selectedSize.height ? Math.round(selectedSize.height) : undefined
    const sizeStr = width && height ? `_${width}x${height}` : ''
    
    if (postType === 'CI') {
      // CI 타입
      if (selectedColor === 'CI_COLOR_SET') {
        // 컬러 세트 선택 시
        return `${baseName}${sizeStr}.${format}`
      } else if (selectedColor === '#000000' || selectedColor?.toLowerCase() === 'black') {
        // 검은색 선택 시
        return `${baseName}_black${sizeStr}.${format}`
      } else if (selectedColor === '#FFFFFF' || selectedColor === '#FFF' || selectedColor?.toLowerCase() === 'white') {
        // 흰색 선택 시
        return `${baseName}_white${sizeStr}.${format}`
      }
    } else if (postType === 'BI') {
      // BI 타입
      if (selectedColor === '#000000' || selectedColor?.toLowerCase() === 'black') {
        // 검은색 선택 시
        return `${baseName}_black${sizeStr}.${format}`
      } else if (selectedColor === '#FFFFFF' || selectedColor === '#FFF' || selectedColor?.toLowerCase() === 'white') {
        // 흰색 선택 시
        return `${baseName}_white${sizeStr}.${format}`
      }
    }
    
    // 기본값
    return `${baseName}${sizeStr}.${format}`
  }

  // 다운로드
  const handleDownload = async (format: 'png' | 'jpg' | 'svg') => {
    if (!selectedPost) return

    try {
      const queryParams = new URLSearchParams({
        format,
        // width와 height를 정수로 반올림하여 전달
        ...(selectedSize.width && { width: Math.round(selectedSize.width).toString() }),
        ...(selectedSize.height && { height: Math.round(selectedSize.height).toString() }),
        ...(selectedColor && { color: selectedColor }),
      })

      const response = await fetch(
        `/api/posts/${selectedPost.id}/ci-bi/download?${queryParams.toString()}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CiBiListPage] 다운로드 에러 응답:', errorText)
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateDownloadFileName(format)
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('[CiBiListPage] Download error:', error)
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

      // 목록에서 제거
      setPosts((prev) => prev.filter((p) => p.id !== deletePostId))
      
      // 선택된 게시물이 삭제된 경우 선택 해제
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
    fetchPosts(1, false, true)
    router.refresh()
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
                <Plus className="h-4 w-4 mr-2" />
                게시물 추가
              </Button>
            )}
          </div>

          {/* 필터 메뉴 */}
          <div className="flex items-center gap-4 mb-3">
            {['ALL', 'CI', 'D.AMO', 'WAPPLES', 'iSIGN', 'Cloudbric', 'etc'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'text-primary font-semibold hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filter === 'etc' ? 'etc.' : filter}
              </button>
            ))}
          </div>

          {/* 게시물이 없을 때 빈 상태 메시지 */}
          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                등록된 게시물이 없습니다.
              </p>
              {isAdmin && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 게시물 추가하기
                </Button>
              )}
            </div>
          )}

          {/* 카드 그리드 */}
          {posts.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {posts.map((post) => (
                <CiBiCard
                  key={post.id}
                  post={post}
                  isSelected={selectedPostId === post.id}
                  selectedColor={selectedPostId === post.id ? selectedColor : undefined}
                  onClick={handlePostClick}
                  onEdit={isAdmin ? handleEdit : undefined}
                  onDelete={isAdmin ? handleDeleteClick : undefined}
                  showActions={isAdmin}
                />
              ))}
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          {hasMore && <div ref={loadMoreRef} className="h-20" />}

          {/* 로딩 표시 */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* 우측: 속성 패널 */}
      <PropertyPanel
        post={selectedPost}
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        onSizeChange={handleSizeChange}
        onDownload={handleDownload}
      />

      {/* 업로드 다이얼로그 */}
      {isAdmin && (
        <CiBiUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          categorySlug={category.slug}
          categoryId={category.id}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 수정 다이얼로그 */}
      {isAdmin && editPostId && editPost && (
        <CiBiUploadDialog
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
