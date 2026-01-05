import { notFound } from 'next/navigation'
import { getCategoryBySlug } from '@/lib/categories'
import { CategoryType } from '@prisma/client'
import { GalleryListPage } from '@/app/_category-pages/gallery/GalleryListPage'

// 카테고리 타입별 기본 pageType 반환
function getDefaultPageType(categoryType: CategoryType): string {
  switch (categoryType) {
    case CategoryType.WORK:
      return 'gallery'
    case CategoryType.TEMPLATE:
      return 'editor'
    default:
      return 'list'
  }
}

export const dynamic = 'force-dynamic'

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = await getCategoryBySlug(params.slug)

  if (!category) {
    notFound()
  }

  // 카테고리 타입에 따라 다른 컴포넌트 렌더링
  const pageType = category.pageType || getDefaultPageType(category.type)

  switch (pageType) {
    case 'gallery':
      return <GalleryListPage category={category} />

    case 'editor':
      // TODO: EditorListPage 구현 시 추가
      return (
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground mt-4">
            편집 타입 페이지는 아직 구현되지 않았습니다.
          </p>
        </div>
      )

    case 'list':
    default:
      return (
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground mt-4">
            기본 목록 타입 페이지는 아직 구현되지 않았습니다.
          </p>
        </div>
      )
  }
}

