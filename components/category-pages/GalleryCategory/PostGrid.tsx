'use client'

import { PostCard } from './PostCard'
import { Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Flipper, Flipped } from 'react-flip-toolkit'

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
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()

  // 컨테이너 너비에 따라 열 개수 계산 (useCallback으로 최적화)
  const calculateColumns = useCallback(() => {
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
    
    posts.forEach((post) => {
      // 가장 짧은 열에 카드 추가 (Pinterest 스타일)
      const shortestColumnIndex = newColumns.reduce((minIndex, column, i) => {
        return column.length < newColumns[minIndex].length ? i : minIndex
      }, 0)
      newColumns[shortestColumnIndex].push(post)
    })
    
    setColumns(newColumns)
  }, [posts])

  useEffect(() => {
    calculateColumns()

    // 디바운싱된 resize 핸들러로 성능 최적화 및 부드러운 애니메이션
    const handleResize = () => {
      // 이전 타이머가 있으면 취소
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      
      // 150ms 후에 실행 (브라우저 리사이즈가 끝난 후)
      resizeTimeoutRef.current = setTimeout(() => {
        calculateColumns()
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      // 컴포넌트 언마운트 시 타이머 정리
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [calculateColumns])

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

  // Flipper의 flipKey는 columns 구조가 변경될 때마다 업데이트되어 애니메이션 트리거
  // 각 컬럼의 post id 순서를 기반으로 flipKey 생성
  const flipKey = columns.length > 0 
    ? columns.map((col, idx) => `${idx}:${col.map(p => p.id).join(',')}`).join('|')
    : 'empty'

  return (
    <>
      <Flipper 
        flipKey={flipKey}
        // gentle (부드러운 반동), wobbly (더 강한 반동), stiff (덜 반동 (빠르고 딱딱함), noWobble (반동 없음 (부드럽게 정지)
        spring={{ stiffness: 160, damping: 22 }} // spring 객체 사용해도 됨 
        staggerConfig={{
          default: {
            speed: 0.5,
          },
        }}
        decisionData={columns}
      >
        <div ref={containerRef} className="masonry-container justify-center md:justify-start">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="masonry-column">
              {column.map((post) => {
                // 이미지 URL을 포함한 고유 key 생성 (이미지 변경 시 재렌더링 보장)
                const imageUrl = post.thumbnailUrl || post.fileUrl || ''
                const postKey = `${post.id}-${imageUrl}`
                
                return (
                  <Flipped key={post.id} flipId={post.id}>
                    <div>
                      <PostCard 
                        key={postKey} // 이미지 URL 변경 시 재렌더링
                        post={post} 
                        categorySlug={categorySlug} 
                        onClick={onPostClick} 
                      />
                    </div>
                  </Flipped>
                )
              })}
            </div>
          ))}
        </div>
      </Flipper>
      {loading && (
        <div className="w-full flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  )
}

