'use client'

import { useRouter } from 'next/navigation'

interface PostImage {
  url: string
  name: string
  order: number
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  thumbnailUrl?: string | null
  images?: PostImage[] | null | any // Prisma JSON 필드는 any 타입일 수 있음
  fileUrl?: string
}

interface PostCardProps {
  post: Post
  categorySlug?: string
  onClick?: (postId: string) => void
}

export function PostCard({ post, categorySlug, onClick }: PostCardProps) {
  const router = useRouter()

  // 첫 번째 이미지 URL 추출
  const getFirstImageUrl = () => {
    // images가 JSON 타입일 수 있으므로 타입 확인
    let images: PostImage[] = []
    
    if (post.images) {
      // 이미 배열인 경우 (Prisma가 이미 파싱한 경우)
      if (Array.isArray(post.images)) {
        images = post.images as PostImage[]
      } 
      // 문자열인 경우 (JSON 문자열)
      else if (typeof post.images === 'string') {
        try {
          const parsed = JSON.parse(post.images)
          images = Array.isArray(parsed) ? parsed : []
        } catch {
          images = []
        }
      }
      // 객체인 경우 (Prisma JsonValue 타입)
      else if (typeof post.images === 'object' && post.images !== null) {
        // Prisma가 반환하는 JsonValue는 이미 파싱된 배열일 수 있음
        const parsed = post.images as any
        if (Array.isArray(parsed)) {
          images = parsed
        } else {
          images = []
        }
      }
    }

    if (images.length > 0) {
      // order로 정렬
      const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0))
      const firstImage = sortedImages[0]
      if (firstImage && firstImage.url) {
        return firstImage.url
      }
    }
    
    // fallback: thumbnailUrl 또는 fileUrl 사용
    return post.thumbnailUrl || post.fileUrl || '/placeholder.png'
  }

  const handleClick = () => {
    if (onClick) {
      onClick(post.id)
    } else if (categorySlug) {
      router.push(`/${categorySlug}/${post.id}`)
    }
  }

  const imageUrl = getFirstImageUrl()

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = () => {
    if (imageUrl.startsWith('http') && imageUrl.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(imageUrl)}`
    }
    return imageUrl
  }

  return (
    <div
      className="w-[285px] cursor-pointer group flex-shrink-0"
      onClick={handleClick}
    >
      <div className="relative w-full overflow-hidden rounded-lg bg-muted">
        <img
          src={getImageSrc()}
          alt={post.title}
          className="w-full h-auto object-cover transition-all duration-300 group-hover:brightness-50"
        />
        {/* 호버 시 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
        {/* 호버 시 좌측 하단에 제목과 부제목 표시 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="font-medium text-sm text-white line-clamp-2 drop-shadow-lg">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="text-xs text-white/90 mt-1 line-clamp-1 drop-shadow-lg">
              {post.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

