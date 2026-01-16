import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

// 최근 게시물 가져오기 (60초 캐시)
export const getRecentPosts = unstable_cache(
  async () => {
    return prisma.post.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    })
  },
  ['recent-posts'],
  {
    revalidate: 60, // 1분 캐시
    tags: ['posts'],
  }
)

// 최근 공지사항 가져오기 (60초 캐시)
export const getRecentNotices = unstable_cache(
  async () => {
    return prisma.notice.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    })
  },
  ['recent-notices'],
  {
    revalidate: 60, // 1분 캐시
    tags: ['notices'],
  }
)
