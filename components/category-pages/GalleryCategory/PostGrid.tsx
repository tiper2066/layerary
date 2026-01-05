'use client'

import { PostCard } from './PostCard'
import { Loader2 } from 'lucide-react'

interface Post {
  id: string
  title: string
  subtitle?: string | null
  thumbnailUrl?: string | null
  images?: Array<{ url: string; name: string; order: number }> | null
  fileUrl?: string
  category?: {
    slug: string
  }
}

interface PostGridProps {
  posts: Post[]
  categorySlug?: string
  loading?: boolean
  onPostClick?: (postId: string) => void
}

export function PostGrid({ posts, categorySlug, loading, onPostClick }: PostGridProps) {
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        등록된 게시물이 없습니다.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} categorySlug={categorySlug} onClick={onPostClick} />
      ))}
      {loading && (
        <div className="col-span-full flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

