import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

// 통합된 최근 게시물 타입
type RecentItem = {
  id: string
  title: string
  createdAt: Date
  category: {
    id: string
    name: string
    slug: string
    type: string
    pageType: string | null
  }
  author: {
    name: string | null
  }
  isTemplate?: boolean // 웰컴보드 템플릿인지 구분
}

// 최근 게시물 가져오기 (60초 캐시) - Post와 WelcomeBoardTemplate 통합
export const getRecentPosts = unstable_cache(
  async (): Promise<RecentItem[]> => {
    // Post와 WelcomeBoardTemplate을 병렬로 조회
    const [posts, templates, welcomeBoardCategory] = await Promise.all([
      prisma.post.findMany({
        take: 10, // 더 많이 가져와서 정렬 후 상위 3개 선택
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
      }),
      prisma.welcomeBoardTemplate.findMany({
        where: {
          status: 'PUBLISHED',
        },
        take: 10,
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
      }),
      prisma.category.findUnique({
        where: { slug: 'welcome-board' },
      }),
    ])

    // Post를 RecentItem 형태로 변환
    const postItems: RecentItem[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
      category: {
        id: post.category.id,
        name: post.category.name,
        slug: post.category.slug,
        type: post.category.type,
        pageType: post.category.pageType,
      },
      author: {
        name: post.author.name,
      },
      isTemplate: false,
    }))

    // WelcomeBoardTemplate을 RecentItem 형태로 변환
    const templateItems: RecentItem[] = templates.map((template) => ({
      id: template.id,
      title: template.name, // template.name을 title로 사용
      createdAt: template.createdAt,
      category: welcomeBoardCategory
        ? {
            id: welcomeBoardCategory.id,
            name: welcomeBoardCategory.name,
            slug: welcomeBoardCategory.slug,
            type: welcomeBoardCategory.type,
            pageType: welcomeBoardCategory.pageType,
          }
        : {
            id: '',
            name: '웰컴보드',
            slug: 'welcome-board',
            type: 'TEMPLATE',
            pageType: 'welcomeboard',
          },
      author: {
        name: template.author.name,
      },
      isTemplate: true,
    }))

    // 두 배열을 합치고 createdAt 기준으로 정렬
    const allItems = [...postItems, ...templateItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    // 상위 3개만 반환
    return allItems.slice(0, 3)
  },
  ['recent-posts'],
  {
    revalidate: 60, // 1분 캐시
    tags: ['posts', 'welcomeboard-templates'],
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
