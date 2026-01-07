'use client'

import { useEffect, useState, useRef } from 'react'
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
  horizontal?: boolean // 모바일용 수평 레이아웃
}

export function PostNavigation({
  allPosts,
  currentPostId,
  onNavigate,
  horizontal = false,
}: PostNavigationProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevButtonRef = useRef<HTMLButtonElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)

  // 현재 게시물 인덱스 찾기
  const currentIndex = allPosts.findIndex((post) => post.id === currentPostId)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  // 키보드 네비게이션 (상/하 방향키 또는 좌/우 방향키)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (horizontal) {
        // 수평 레이아웃: 좌/우 방향키
        if (e.key === 'ArrowLeft' && prevPost) {
          e.preventDefault()
          onNavigate(prevPost.id)
        } else if (e.key === 'ArrowRight' && nextPost) {
          e.preventDefault()
          onNavigate(nextPost.id)
        }
      } else {
        // 수직 레이아웃: 상/하 방향키
        if (e.key === 'ArrowUp' && prevPost) {
          e.preventDefault()
          onNavigate(prevPost.id)
        } else if (e.key === 'ArrowDown' && nextPost) {
          e.preventDefault()
          onNavigate(nextPost.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevPost, nextPost, onNavigate, horizontal])

  // 스크롤 위치 추적
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (horizontal) {
        setScrollPosition(container.scrollLeft)
      } else {
        setScrollPosition(container.scrollTop)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [horizontal])

  const canScrollUp = horizontal ? scrollPosition > 0 : scrollPosition > 0
  const canScrollDown = horizontal
    ? containerRef.current &&
      containerRef.current.scrollWidth >
        containerRef.current.scrollLeft + containerRef.current.clientWidth
    : containerRef.current &&
      containerRef.current.scrollHeight >
        containerRef.current.scrollTop + containerRef.current.clientHeight

  const scroll = (direction: 'up' | 'down' | 'left' | 'right') => {
    const container = containerRef.current
    if (!container) return

    const scrollAmount = 200
    if (horizontal) {
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    } else {
      container.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
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

  // 수평 레이아웃 (모바일)
  if (horizontal) {
    return (
      <div className="h-24 w-full flex items-center bg-neutral-50 dark:bg-neutral-900 border-t">
        {/* 스크롤 좌측 버튼 */}
        {canScrollUp && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none flex-shrink-0"
            onClick={() => scroll('left')}
          >
            <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
          </Button>
        )}

        {/* 썸네일 목록 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden flex gap-2 px-2 horizontal-nav-scroll"
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
                  'h-20 w-20 flex-shrink-0 relative rounded-md overflow-hidden border-2 transition-colors group',
                  isActive
                    ? 'border-primary'
                    : 'border-transparent hover:border-primary'
                )}
              >
                {post.thumbnailUrl ? (
                  <img
                    src={getThumbnailSrc(post.thumbnailUrl) || '/placeholder.png'}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover"
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

        {/* 스크롤 우측 버튼 */}
        {canScrollDown && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none flex-shrink-0"
            onClick={() => scroll('right')}
          >
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </Button>
        )}
      </div>
    )
  }

  // 수직 레이아웃 (데스크톱)
  return (
    <div className="w-24 h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
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
                <img
                  src={getThumbnailSrc(post.thumbnailUrl) || '/placeholder.png'}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
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

