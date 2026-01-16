import { Skeleton } from '@/components/ui/skeleton'

interface PostCardSkeletonProps {
  width?: number
  height?: number
  showButtons?: boolean
}

export function PostCardSkeleton({ 
  width = 285, 
  height, 
  showButtons = false 
}: PostCardSkeletonProps) {
  // 높이가 지정되지 않으면 aspect ratio에 맞춤
  const cardHeight = height || (width * 4 / 3)

  return (
    <div
      className="flex-shrink-0 rounded-lg overflow-hidden bg-muted"
      style={{ width: `${width}px`, height: `${cardHeight}px` }}
    >
      <Skeleton className="w-full h-full" />
      {showButtons && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      )}
    </div>
  )
}
