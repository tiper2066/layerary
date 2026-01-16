import { Skeleton } from '@/components/ui/skeleton'

interface ListSkeletonProps {
  count?: number
  className?: string
}

export function ListSkeleton({ count = 3, className = '' }: ListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 p-4 rounded-lg">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 flex-1" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
