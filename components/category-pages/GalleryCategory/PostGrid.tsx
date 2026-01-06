'use client'

import { PostCard } from './PostCard'
import { Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

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
  const [columns, setColumns] = useState<Post[][]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // 컨테이너 너비에 따라 열 개수 계산
  useEffect(() => {
    const calculateColumns = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const cardWidth = 285
      const gap = 10
      
      // 사용 가능한 너비 계산 (컨테이너 너비에서 gap 제외)
      const availableWidth = containerWidth
      
      // 열 개수 계산: (사용 가능 너비 + gap) / (카드 너비 + gap)
      const numColumns = Math.max(1, Math.floor((availableWidth + gap) / (cardWidth + gap)))
      
      // 각 열에 카드 분배
      const newColumns: Post[][] = Array(numColumns).fill(null).map(() => [])
      
      posts.forEach((post, index) => {
        // 가장 짧은 열에 카드 추가 (Pinterest 스타일)
        const shortestColumnIndex = newColumns.reduce((minIndex, column, i) => {
          return column.length < newColumns[minIndex].length ? i : minIndex
        }, 0)
        newColumns[shortestColumnIndex].push(post)
      })
      
      setColumns(newColumns)
    }

    calculateColumns()

    const handleResize = () => {
      calculateColumns()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [posts])

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
    <>
      <div ref={containerRef} className="masonry-container">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="masonry-column">
            {column.map((post) => (
              <PostCard key={post.id} post={post} categorySlug={categorySlug} onClick={onPostClick} />
            ))}
          </div>
        ))}
      </div>
      {loading && (
        <div className="w-full flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  )
}

