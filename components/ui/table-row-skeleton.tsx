import { Skeleton } from '@/components/ui/skeleton'
import { TableRow, TableCell } from '@/components/ui/table'

interface TableRowSkeletonProps {
  columns?: number
  showAvatar?: boolean
}

export function TableRowSkeleton({ columns = 5, showAvatar = false }: TableRowSkeletonProps) {
  return (
    <TableRow>
      {showAvatar && (
        <TableCell>
          <Skeleton className="h-10 w-10 rounded-full" />
        </TableCell>
      )}
      {Array.from({ length: columns }).map((_, index) => (
        <TableCell key={index}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}
