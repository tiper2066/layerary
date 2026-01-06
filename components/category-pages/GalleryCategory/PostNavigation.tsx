'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationPost {
  id: string
  title: string
  thumbnailUrl: string | null
}

interface PostNavigationProps {
  allPosts: NavigationPost[]
  currentPostId: string
  onNavigate: (postId: string) => void
}

export function PostNavigation({
  allPosts,
  currentPostId,
  onNavigate,
}: PostNavigationProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevButtonRef = useRef<HTMLButtonElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)

  // 현재 게시물 인덱스 찾기
  const currentIndex = allPosts.findIndex((post) => post.id === currentPostId)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  // 키보드 네비게이션 (상/하 방향키)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && prevPost) {
        e.preventDefault()
        onNavigate(prevPost.id)
      } else if (e.key === 'ArrowDown' && nextPost) {
        e.preventDefault()
        onNavigate(nextPost.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevPost, nextPost, onNavigate])

  // 스크롤 위치 추적
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollPosition(container.scrollTop)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const canScrollUp = scrollPosition > 0
  const canScrollDown =
    containerRef.current &&
    containerRef.current.scrollHeight >
      containerRef.current.scrollTop + containerRef.current.clientHeight

  const scroll = (direction: 'up' | 'down') => {
    const container = containerRef.current
    if (!container) return

    const scrollAmount = 200
    container.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getThumbnailSrc = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  if (allPosts.length === 0) {
    return null
  }

  return (
    <div className="w-24 h-full flex flex-col bg-neutral-50">
      {/* 스크롤 업 버튼 */}
      {canScrollUp && (
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none"
          onClick={() => scroll('up')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}

      {/* 썸네일 목록 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 p-4"
      >
        {allPosts.map((post, index) => {
          const isActive = post.id === currentPostId
          const buttonRef = index === currentIndex - 1 ? prevButtonRef : index === currentIndex + 1 ? nextButtonRef : null

          return (
            <button
              key={post.id}
              ref={buttonRef}
              onClick={() => onNavigate(post.id)}
              className={cn(
                'w-full aspect-square relative rounded-md overflow-hidden border-2 transition-colors group',
                isActive
                  ? 'border-primary'
                  : 'border-transparent hover:border-primary'
              )}
            >
              {post.thumbnailUrl ? (
                <Image
                  src={getThumbnailSrc(post.thumbnailUrl) || '/placeholder.png'}
                  alt={post.title}
                  fill
                  className="object-cover"
                  unoptimized={post.thumbnailUrl.startsWith('http')}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No Image
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-white text-[10px] line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {post.title}
              </div>
            </button>
          )
        })}
      </div>

      {/* 스크롤 다운 버튼 */}
      {canScrollDown && (
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none"
          onClick={() => scroll('down')}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

