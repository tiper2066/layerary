import { getCategoriesByType } from '@/lib/categories'
import { CategoryType } from '@prisma/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { CategoryCard } from '@/components/CategoryCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 4개 메인 카테고리 가져오기
  const workCategories = await getCategoriesByType(CategoryType.WORK)
  const sourceCategories = await getCategoriesByType(CategoryType.SOURCE)
  const templateCategories = await getCategoriesByType(CategoryType.TEMPLATE)
  const brochureCategories = await getCategoriesByType(CategoryType.BROCHURE)

  // 최근 게시물 (더미 데이터 대신 실제 데이터)
  const recentPosts = await prisma.post.findMany({
    take: 6,
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

  // 공지사항 (더미 데이터 대신 실제 데이터)
  const notices = await prisma.notice.findMany({
    take: 5,
    where: {
      isImportant: true,
    },
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

  const getFirstCategorySlug = (categories: typeof workCategories) => {
    if (categories.length > 0) {
      const firstCategory = categories[0]
      if (firstCategory.children && firstCategory.children.length > 0) {
        return firstCategory.children[0].slug
      }
      return firstCategory.slug
    }
    return '#'
  }

  const categoryCards = [
    {
      title: 'WORK',
      description: '기 제작된 디자인 산출물',
      iconName: 'Briefcase',
      color: 'bg-blue-500',
      href: getFirstCategorySlug(workCategories),
      count: workCategories.length,
    },
    {
      title: 'SOURCE',
      description: 'CI/BI, ICON, 캐릭터 등',
      iconName: 'Palette',
      color: 'bg-purple-500',
      href: getFirstCategorySlug(sourceCategories),
      count: sourceCategories.length,
    },
    {
      title: 'TEMPLATE',
      description: 'PPT, 카드, 바탕화면 등',
      iconName: 'FileText',
      color: 'bg-green-500',
      href: getFirstCategorySlug(templateCategories),
      count: templateCategories.length,
    },
    {
      title: 'BROCHURE',
      description: '제품별 브로셔',
      iconName: 'BookOpen',
      color: 'bg-orange-500',
      href: getFirstCategorySlug(brochureCategories),
      count: brochureCategories.length,
    },
  ]

  return (
    <div className="space-y-12">
      {/* 카테고리 카드 */}
      <section>
        <h2 className="text-3xl font-bold mb-8">카테고리</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryCards.map((card) => (
            <CategoryCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* 최근 게시물 */}
        <section>
          <h2 className="text-2xl font-bold mb-6">최근 게시물</h2>
          <Card>
            <CardContent className="p-6">
              {recentPosts.length > 0 ? (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/${post.category.slug}/${post.id}`}
                      className="block p-4 rounded-lg hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base mb-2">{post.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {post.category.name} · {post.author.name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  등록된 게시물이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 공지사항 */}
        <section>
          <h2 className="text-2xl font-bold mb-6">공지사항</h2>
          <Card>
            <CardContent className="p-6">
              {notices.length > 0 ? (
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <Link
                      key={notice.id}
                      href={`/notices/${notice.id}`}
                      className="block p-4 rounded-lg hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-base">{notice.title}</h3>
                            {notice.isImportant && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                중요
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notice.author.name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  등록된 공지사항이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
