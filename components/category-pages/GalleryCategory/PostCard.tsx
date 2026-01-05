'use client'

import Image from 'next/image'
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
      className="w-[314px] cursor-pointer group"
      onClick={handleClick}
    >
      <div className="relative w-full overflow-hidden rounded-lg bg-muted aspect-auto mb-2">
        <Image
          src={getImageSrc()}
          alt={post.title}
          width={314}
          height={0}
          className="w-full h-auto object-cover transition-transform group-hover:scale-105"
          unoptimized={imageUrl.startsWith('http')}
        />
      </div>
      <h3 className="font-medium text-sm mt-2 line-clamp-2 group-hover:text-primary transition-colors">
        {post.title}
      </h3>
      {post.subtitle && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {post.subtitle}
        </p>
      )}
    </div>
  )
}

