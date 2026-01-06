'use client'

import { useSession } from 'next-auth/react'

interface Tag {
  id: string
  name: string
  slug: string
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  concept?: string | null
  tool?: string | null
  viewCount: number
  createdAt: string
  tags?: Array<{ tag: Tag }>
  author?: {
    name: string | null
    email: string
  }
}

interface PostInfoProps {
  post: Post
}

export function PostInfo({ post }: PostInfoProps) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* 제목 및 부제목 */}
      <div>
        <h1 className="text-lg font-bold mb-2">{post.title}</h1>
        {post.subtitle && (
          <p className="text-foreground">{post.subtitle}</p>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="space-y-6 text-sm pb-6">
        {post.concept && (
          <div>
            <span className="text-[10px] font-medium text-muted-foreground">CONCEPT</span>
            <p className="mt-1">{post.concept}</p>
          </div>
        )}

        {post.tool && (
          <div>
            <span className="text-[10px] font-medium text-muted-foreground">TOOL</span>
            <p className="mt-1">{post.tool}</p>
          </div>
        )}

        {post.description && (
          <div>
            <span className="font-medium text-muted-foreground">DESCRIPTION</span>
            <p className="mt-1 whitespace-pre-wrap">{post.description}</p>
          </div>
        )}
      </div>

      {/* 태그 */}
      {post.tags && post.tags.length > 0 && (
        <div className="border-t pt-[50px]">
          <div className="flex flex-wrap gap-2">
            {post.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-regular bg-gray-100 text-primary/60"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 추가 정보 (관리자만 표시) */}
      {isAdmin && (
        <div className="pt-[50px] space-y-2 text-xs text-muted-foreground">
          <div>
            작성자: {post.author?.name || post.author?.email || '알 수 없음'}
          </div>
          <div>작성일: {formatDate(post.createdAt)}</div>
          <div>조회수: {post.viewCount}</div>
        </div>
      )}
    </div>
  )
}

