import { Skeleton } from '@/components/ui/skeleton'

interface ImageCardSkeletonProps {
  width?: number | string
  height?: number | string
  className?: string
}

export function ImageCardSkeleton({ 
  width, 
  height, 
  className = '' 
}: ImageCardSkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`rounded-lg overflow-hidden bg-muted ${className}`}
      style={style}
    >
      <Skeleton className="w-full h-full" />
    </div>
  )
}
