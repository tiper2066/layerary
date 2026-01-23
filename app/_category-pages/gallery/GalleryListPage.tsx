'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PostGrid } from '@/components/category-pages/GalleryCategory/PostGrid'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PostUploadDialog } from '@/components/category-pages/GalleryCategory/PostUploadDialog'

interface Category {
  id: string
  name: string
  slug: string
  type: string
  pageType?: string | null
}

interface GalleryListPageProps {
  category: Category
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  thumbnailUrl?: string | null
  images?: Array<{ url: string; name: string; order: number }> | null | any // Prisma JSON 필드는 any 타입일 수 있음
  fileUrl?: string
  category?: {
    slug: string
  }
}

export function GalleryListPage({ category }: GalleryListPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [posts, setPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL') // 필터 상태
  // 하이브리드 캐싱: 최근 3개 필터의 데이터를 메모리에 저장 (useRef 사용으로 무한 루프 방지)
  const filterCacheRef = useRef<Record<string, Post[]>>({})
  const filterCacheOrderRef = useRef<string[]>([]) // 캐시 순서 추적 (LRU 방식)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 연도 필터 옵션 생성 (ALL, 현재 연도, 현재 연도-1, 현재 연도-2, 현재 연도-3, ~2022)
  const getYearFilters = () => {
    const currentYear = new Date().getFullYear()
    const filters = ['ALL']
    
    // 현재 연도부터 3년 전까지
    for (let year = currentYear; year >= currentYear - 3; year--) {
      filters.push(year.toString())
    }
    
    // ~2022 추가
    filters.push('~2022')
    
    return filters
  }

  const yearFilters = getYearFilters()

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
        
        // 연도 필터 적용
        if (selectedFilter !== 'ALL') {
          params.append('year', selectedFilter)
        }
        
        if (forceRefresh) {
          params.append('_t', Date.now().toString())
        }
        
        const response = await fetch(`/api/posts?${params.toString()}`, {
          cache: forceRefresh ? 'no-store' : 'default', // 강제 새로고침 시 캐시 무시
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
          
          // 캐시 저장 (최근 3개 필터만 유지 - LRU 방식)
          if (!append && pageNum === 1) {
            filterCacheRef.current[selectedFilter] = data.posts
            
            // 최근 사용한 필터 순서 업데이트
            const order = filterCacheOrderRef.current.filter((f) => f !== selectedFilter)
            order.unshift(selectedFilter) // 맨 앞에 추가
            
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
      }
    },
    [category.slug, selectedFilter]
  )

  // 필터 변경 시 목록 새로고침
  useEffect(() => {
    setPage(1)
    
    // 하이브리드 캐싱: 캐시된 데이터가 있으면 즉시 표시
    if (filterCacheRef.current[selectedFilter] && filterCacheRef.current[selectedFilter].length > 0) {
      setPosts(filterCacheRef.current[selectedFilter])
      // 백그라운드에서 최신 데이터 확인 (브라우저 캐시 활용)
      fetchPosts(1, false, false)
    } else {
      // 캐시가 없으면 로딩 표시 후 API 호출
      setPosts([]) // 게시물 초기화하여 로딩 애니메이션 표시
      setHasMore(true)
      fetchPosts(1, false, false)
    }
  }, [selectedFilter, fetchPosts]) // filterCache 의존성 제거 (무한 루프 방지)

  // 초기 로드
  useEffect(() => {
    fetchPosts(1, false)
  }, [fetchPosts])

  // 새로고침 파라미터 감지 (삭제 후 목록으로 돌아올 때)
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      // 모든 캐시 무효화
      filterCacheRef.current = {}
      filterCacheOrderRef.current = []
      
      // 새로고침 파라미터가 있으면 강제 새로고침
      setPage(1)
      setHasMore(true)
      fetchPosts(1, false, true)
      // URL에서 refresh 파라미터 제거 (히스토리 정리)
      router.replace(`/${category.slug}`, { scroll: false })
    }
  }, [searchParams, fetchPosts, category.slug, router])

  // 페이지 변경 시 추가 로드
  useEffect(() => {
    if (page > 1) {
      fetchPosts(page, true)
    }
  }, [page, fetchPosts])

  const handlePostClick = (postId: string) => {
    router.push(`/${category.slug}/${postId}`)
  }

  const handleUploadSuccess = () => {
    // 현재 필터의 캐시 무효화
    delete filterCacheRef.current[selectedFilter]
    filterCacheOrderRef.current = filterCacheOrderRef.current.filter((f) => f !== selectedFilter)
    
    // 업로드 성공 시 목록 강제 새로고침 (캐시 무시)
    setPage(1)
    setHasMore(true)
    fetchPosts(1, false, true) // forceRefresh: true 추가
    router.refresh() // 서버 컴포넌트 재렌더링
  }

  return (
    <div className="w-full px-0 py-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {isAdmin && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            게시물 추가
          </Button>
        )}
      </div>

      {/* 필터 메뉴 */}
      <div className="flex items-center gap-4 mb-3">
        {yearFilters.map((filter) => (
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

      <PostGrid posts={posts} categorySlug={category.slug} loading={loading} onPostClick={handlePostClick} />

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

      {isAdmin && (
        <PostUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          categorySlug={category.slug}
          categoryId={category.id}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}

