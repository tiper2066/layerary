'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImageGallery } from '@/components/category-pages/GalleryCategory/ImageGallery'
import { PostInfo } from '@/components/category-pages/GalleryCategory/PostInfo'
import { PostNavigation } from '@/components/category-pages/GalleryCategory/PostNavigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface PostImage {
  url: string
  name: string
  order: number
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  concept?: string | null
  tool?: string | null
  images?: PostImage[] | null | any // Prisma JSON 필드는 any 타입일 수 있음
  viewCount: number
  createdAt: string
  tags?: Array<{ tag: Tag }>
  author?: {
    name: string | null
    email: string
  }
  category?: {
    slug: string
  }
}

interface NavigationPost {
  id: string
  title: string
  thumbnailUrl: string | null
}

interface GalleryDetailPageProps {
  category: Category
  postId: string
}

export function GalleryDetailPage({ category, postId }: GalleryDetailPageProps) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [prevPost, setPrevPost] = useState<NavigationPost | null>(null)
  const [nextPost, setNextPost] = useState<NavigationPost | null>(null)
  const [loading, setLoading] = useState(true)

  // 게시물 상세 조회
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const [postResponse, navResponse] = await Promise.all([
          fetch(`/api/posts/${postId}`),
          fetch(`/api/posts/${postId}/navigation?categorySlug=${category.slug}`),
        ])

        if (!postResponse.ok) {
          throw new Error('게시물을 불러오는데 실패했습니다.')
        }

        const postData = await postResponse.json()
        setPost(postData.post)

        if (navResponse.ok) {
          const navData = await navResponse.json()
          setPrevPost(navData.prevPost)
          setNextPost(navData.nextPost)
        }
      } catch (error) {
        console.error('Error fetching post:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, category.slug])

  const handleNavigate = (id: string) => {
    router.push(`/${category.slug}/${id}`)
  }

  const handleClose = () => {
    router.push(`/${category.slug}`)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 top-16 left-56 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="fixed inset-0 top-16 left-56 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">게시물을 찾을 수 없습니다.</p>
          <Button onClick={handleClose}>목록으로 돌아가기</Button>
        </div>
      </div>
    )
  }

  // images 배열 추출 (Prisma JSON 필드 처리)
  const getImages = (): PostImage[] => {
    if (!post.images) return []
    
    if (Array.isArray(post.images)) {
      return post.images as PostImage[]
    }
    
    // JSON 필드가 객체로 반환될 수 있음
    try {
      const parsed = typeof post.images === 'string' 
        ? JSON.parse(post.images) 
        : post.images
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  
  const images = getImages()

  return (
    <div className="fixed inset-0 top-16 left-56 bg-background overflow-hidden flex flex-col">
      {/* 닫기 버튼 */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="bg-background/80 backdrop-blur-sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-full">
        {/* 좌측: 이미지 갤러리 */}
        <div className="flex-1 overflow-y-auto">
          <ImageGallery images={images} />
        </div>

        {/* 우측: 상세 정보 + 네비게이션 */}
        <div className="w-96 flex flex-col border-l">
          <div className="flex-1 overflow-y-auto p-6">
            <PostInfo post={post} />
          </div>

          {/* 우측 끝: 네비게이션 */}
          <PostNavigation
            prevPost={prevPost}
            nextPost={nextPost}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </div>
  )
}

