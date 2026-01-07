import { getCategoriesByType } from '@/lib/categories'
import { CategoryType } from '@prisma/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { CategoryCard } from '@/components/CategoryCard'
import { ThemeLogo } from '@/components/ThemeLogo'
import { NoticesSection } from '@/components/NoticesSection'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 4개 메인 카테고리 가져오기
  const workCategories = await getCategoriesByType(CategoryType.WORK)
  const sourceCategories = await getCategoriesByType(CategoryType.SOURCE)
  const templateCategories = await getCategoriesByType(CategoryType.TEMPLATE)
  const brochureCategories = await getCategoriesByType(CategoryType.BROCHURE)

  // 최근 게시물 (최근 게시된 3개)
  const recentPosts = await prisma.post.findMany({
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

  // 공지사항 (최근 게시된 3개)
  const notices = await prisma.notice.findMany({
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
      description: '디자인 산출물 목록',
      iconName: 'Wallpaper',
      color: 'bg-penta-indigo/5 dark:bg-penta-indigo/30 text-penta-indigo',
      href: getFirstCategorySlug(workCategories),
      count: workCategories.length,
    },
    {
      title: 'SOURCE',
      description: 'CI/BI, ICON 등 벡터 편집',
      iconName: 'Image',
      color: 'bg-penta-green/5 dark:bg-penta-green/20 text-penta-green',
      href: getFirstCategorySlug(sourceCategories),
      count: sourceCategories.length,
    },
    {
      title: 'TEMPLATE',
      description: 'PPT, 카드, 바탕화면 등 다운로드',
      iconName: 'FileText',
      color: 'bg-penta-yellow/10 dark:bg-penta-yellow/20 text-penta-yellow',
      href: getFirstCategorySlug(templateCategories),
      count: templateCategories.length,
    },
    {
      title: 'BROCHURE',
      description: '회사소개서 및 제품 브로셔 다운로드',
      iconName: 'BookOpen',
      color: 'bg-penta-blue/5 dark:bg-penta-blue/30 text-penta-blue',
      href: getFirstCategorySlug(brochureCategories),
      count: brochureCategories.length,
    },
  ]

  // 카테고리 타입에 따른 배경색 매핑
  const getCategoryTypeBadgeColor = (type: CategoryType) => {
    switch (type) {
      case CategoryType.WORK:
        return 'bg-penta-indigo/5 dark:bg-penta-indigo/30 text-penta-indigo'
      case CategoryType.SOURCE:
        return 'bg-penta-green/5 dark:bg-penta-green/30 text-penta-green'
      case CategoryType.TEMPLATE:
        return 'bg-penta-yellow/10 dark:bg-penta-yellow/30 text-penta-yellow'
      case CategoryType.BROCHURE:
        return 'bg-penta-blue/5 dark:bg-penta-blue/30 text-penta-blue'
      default:
        return 'bg-muted dark:bg-muted/30 text-muted-foreground'
    }
  }

  // 카테고리 타입에 따른 라벨
  const getCategoryTypeLabel = (type: CategoryType) => {
    switch (type) {
      case CategoryType.WORK:
        return 'WORK'
      case CategoryType.SOURCE:
        return 'SOURCE'
      case CategoryType.TEMPLATE:
        return 'TEMPLATE'
      case CategoryType.BROCHURE:
        return 'BROCHURE'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      {/* 카테고리 카드 */}
      <section>
        {/* <h2 className="text-3xl font-bold mb-8">카테고리</h2> */}
        <h1 className="tracking-tight flex justify-start items-end w-auto gap-2 pb-4">
          {/* {session?.user?.name ? `${session.user.name} 님 환영합니다.` : "Penta Design Assets Management System"} */}
          <ThemeLogo
            width={160}
            height={40}
            className="h-[20px] w-auto"
            priority
          />
          <p className="text-sm font-reqular mb-[-6px]">Brand & Design Resources</p>
        </h1>
        <p className="text-muted-foreground w-full">
          LAYERARY는 펜타시큐리티의 브랜드와 디자인 기준, 그리고 이를 구성하는 것들을 하나의 체계로 관리하는 포털입니다. <br /> 일관된 브랜드 경험을 위해 필요한 기준과 리소스를 정리하고 공유합니다.<br />
          <span className="text-xs font-regular">LAYERARY is Penta Security’s official portal for managing brand and design standards and assets in one cohesive system. It provides clear guidance and resources to ensure a consistent brand experience.</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {categoryCards.map((card) => (
            <CategoryCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* 최근 게시물 */}
        <section>
          <Card className="py-0 pb-3 gap-3">
            <div className="pt-4 pb-4 pl-6 pr-6 border-b min-h-[65px] flex items-center">
              <h3 className="font-semibold">최근 게시물</h3>
            </div>
            <CardContent className="p-6">
              {recentPosts.length > 0 ? (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/${post.category.slug}/${post.id}`}
                      className="block p-4 rounded-lg hover:bg-accent transition-colors last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {post.category.type && post.category.type !== CategoryType.ADMIN && post.category.type !== CategoryType.ETC && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getCategoryTypeBadgeColor(post.category.type)}`}>
                              {getCategoryTypeLabel(post.category.type)}
                            </span>
                          )}
                          <h3 className="font-medium text-base">{post.title}</h3>
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
        <NoticesSection 
          notices={notices.map(notice => ({
            id: notice.id,
            title: notice.title,
            isImportant: notice.isImportant,
            createdAt: notice.createdAt.toISOString(),
            author: {
              name: notice.author.name,
            },
          }))} 
        />
      </div>
    </div>
  )
}
