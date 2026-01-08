'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PostGrid } from '@/components/category-pages/GalleryCategory/PostGrid'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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
        // 새로고침이 필요한 경우 캐시 무시
        const response = await fetch(
          `/api/posts?categorySlug=${category.slug}&page=${pageNum}&limit=20${forceRefresh ? `&_t=${Date.now()}` : ''}`,
          {
            cache: forceRefresh ? 'no-store' : 'default', // 강제 새로고침 시 캐시 무시
          }
        )

        if (!response.ok) {
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
      } finally {
        setLoading(false)
      }
    },
    [category.slug]
  )

  // 초기 로드
  useEffect(() => {
    fetchPosts(1, false)
  }, [fetchPosts])

  // 새로고침 파라미터 감지 (삭제 후 목록으로 돌아올 때)
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
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
            <Plus className="h-4 w-4 mr-2" />
            게시물 추가
          </Button>
        )}
      </div>

      <PostGrid posts={posts} categorySlug={category.slug} loading={loading} onPostClick={handlePostClick} />

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-20" />

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

